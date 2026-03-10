import React, { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import './App.css';

// 🔥 引入 Firebase 驗證與資料庫功能 🔥
import { auth, googleProvider, db } from './firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  onAuthStateChanged, 
  signOut 
} from 'firebase/auth';
import { collection, doc, setDoc, getDocs, deleteDoc } from 'firebase/firestore';

// 1. 瑪雅圖騰資料庫
const seals = [
  { name: "黃太陽", img: "/20.png" }, { name: "紅龍", img: "/01.png" },
  { name: "白風", img: "/02.png" }, { name: "藍夜", img: "/03.png" },
  { name: "黃種子", img: "/04.png" }, { name: "紅蛇", img: "/05.png" },
  { name: "白世界橋", img: "/06.png" }, { name: "藍手", img: "/07.png" },
  { name: "黃星星", img: "/08.png" }, { name: "紅月", img: "/09.png" },
  { name: "白狗", img: "/10.png" }, { name: "藍猴", img: "/11.png" },
  { name: "黃人", img: "/12.png" }, { name: "紅天行者", img: "/13.png" },
  { name: "白巫師", img: "/14.png" }, { name: "藍鷹", img: "/15.png" },
  { name: "黃戰士", img: "/16.png" }, { name: "紅地球", img: "/17.png" },
  { name: "白鏡", img: "/18.png" }, { name: "藍風暴", img: "/19.png" }
];

const toneNames = [
  "磁性", "月亮", "電力", "自我存在", "超頻", "韻律", "共鳴", 
  "銀河星系", "太陽", "行星", "光譜", "水晶", "宇宙"
];

const earthFamilies = ["極性家族 (Polar)", "基本家族 (Cardinal)", "核心家族 (Core)", "信號家族 (Signal)", "通道家族 (Gateway)"];
const castles = ["紅色時間城堡", "白色時間城堡", "藍色時間城堡", "黃色時間城堡", "綠色時間城堡"];
const castleColors = ["#d32f2f", "#757575", "#1976d2", "#fbc02d", "#388e3c"]; 

const labelStyle = { fontSize: '11px', color: '#888', marginTop: '4px', fontWeight: 'normal', whiteSpace: 'nowrap' };

// UI 樣式設定
const reportCardStyle = {
  backgroundColor: '#f8fafd', borderRadius: '16px', padding: '20px', marginTop: '20px', 
  width: '100%', boxSizing: 'border-box', border: '1px solid #e8eaf6'
};
const reportRowStyle = {
  display: 'flex', justifyContent: 'space-between', padding: '10px 0', 
  borderBottom: '1px dashed #e0e0e0', fontSize: '13px', alignItems: 'center'
};
const reportLabelStyle = { color: '#888', width: '80px', textAlign: 'left' };
const reportValueStyle = { color: '#333', fontWeight: 'bold', flex: 1, textAlign: 'left', paddingLeft: '10px' };

const getTodayString = () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export default function App() {
  const [user, setUser] = useState(null); 
  const [isLoginMode, setIsLoginMode] = useState(true); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [date, setDate] = useState(getTodayString());
  const [userName, setUserName] = useState(''); 
  const captureRef = useRef(null); 
  const [previewImage, setPreviewImage] = useState(null);

  const [aiResponse, setAiResponse] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // 儲存親友紀錄的清單狀態與切換模式
  const [savedRecords, setSavedRecords] = useState([]);
  const [showRecordsView, setShowRecordsView] = useState(false);

  // 🔥 更新：登入時從 Firebase Firestore 抓取雲端紀錄 🔥
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // 名字跟生日保留在本地端方便一打開就有預設值
        const savedName = localStorage.getItem(`maya_name_${currentUser.uid}`);
        const savedDate = localStorage.getItem(`maya_date_${currentUser.uid}`);
        if (savedName) setUserName(savedName);
        if (savedDate) setDate(savedDate);

        // 從雲端資料庫撈取親友紀錄
        try {
          const recordsRef = collection(db, "users", currentUser.uid, "records");
          const snapshot = await getDocs(recordsRef);
          const cloudRecords = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          // 依照時間排序，最新的在上面
          cloudRecords.sort((a, b) => b.timestamp - a.timestamp);
          setSavedRecords(cloudRecords);
        } catch (error) {
          console.error("載入雲端紀錄失敗", error);
        }
      } else {
        setSavedRecords([]); // 登出時清空畫面上的紀錄
      }
    });
    return () => unsubscribe();
  }, []);

  // 名字打字時稍微暫存本地，避免不小心重整不見
  useEffect(() => {
    if (user) {
      if (userName.trim() !== '') localStorage.setItem(`maya_name_${user.uid}`, userName);
      if (date) localStorage.setItem(`maya_date_${user.uid}`, date);
    }
  }, [userName, date, user]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isLoginMode) await signInWithEmailAndPassword(auth, email, password);
      else await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      setAuthError(error.message);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      setAuthError("Google 登入失敗或已取消");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const calculateKin = (inputDate) => {
    const dateObj = new Date(inputDate + 'T00:00:00Z');
    const year = dateObj.getUTCFullYear();
    const month = dateObj.getUTCMonth() + 1; 
    const day = dateObj.getUTCDate();
    const monthDays = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    let dayOfYear = monthDays[month - 1] + day;
    if (month === 2 && day === 29) {
      dayOfYear = monthDays[1] + 28; 
    }
    let currentKin = (232 + year * 105 + dayOfYear) % 260;
    if (currentKin === 0) currentKin = 260;
    return currentKin;
  };

  // --- 計算個人主印記與神諭陣 ---
  const kinNumber = calculateKin(date);
  const toneNumber = ((kinNumber - 1) % 13) + 1;
  const bottomToneNumber = 14 - toneNumber;
  const currentToneName = toneNames[toneNumber - 1]; 
  const mainIndex = kinNumber % 20;

  const getGuideIndex = (main, tone) => {
    const shifts = { 1: 0, 6: 0, 11: 0, 2: 12, 7: 12, 12: 12, 3: 4, 8: 4, 13: 4, 4: 16, 9: 16, 5: 8, 10: 8 };
    return (main + shifts[tone]) % 20;
  };

  const challengeIndex = (mainIndex + 10) % 20;
  const supportIndex = (39 - mainIndex) % 20;
  const hiddenIndex = (21 - mainIndex) % 20;
  const guideIndex = getGuideIndex(mainIndex, toneNumber);
  const wavespellIndex = (mainIndex - (toneNumber - 1) + 260) % 20;

  const mainSeal = seals[mainIndex];
  const challengeSeal = seals[challengeIndex];
  const supportSeal = seals[supportIndex];
  const hiddenSeal = seals[hiddenIndex];
  const guideSeal = seals[guideIndex];
  const wavespellSeal = seals[wavespellIndex];

  // --- 計算宇宙今日印記 ---
  const todayDateString = getTodayString();
  const todayKinNumber = calculateKin(todayDateString);
  const todayToneNumber = ((todayKinNumber - 1) % 13) + 1;
  const todayMainSeal = seals[todayKinNumber % 20];
  const todayToneName = toneNames[todayToneNumber - 1];

  const earthFamilyIndex = mainIndex % 5;
  const earthFamilyName = earthFamilies[earthFamilyIndex];
  const castleIndex = Math.floor((kinNumber - 1) / 52);
  const castleName = castles[castleIndex];
  const castleColor = castleColors[castleIndex];

  const fullHiddenKin = 261 - kinNumber;
  const fullHiddenTone = ((fullHiddenKin - 1) % 13) + 1;
  const fullHiddenSeal = seals[fullHiddenKin % 20];
  const fullHiddenName = `${toneNames[fullHiddenTone - 1]}的${fullHiddenSeal.name}`;

  let personalDailyKin = (kinNumber + todayKinNumber) % 260;
  if (personalDailyKin === 0) personalDailyKin = 260;
  const personalDailyToneNumber = ((personalDailyKin - 1) % 13) + 1;
  const personalDailyMainSeal = seals[personalDailyKin % 20];
  const personalDailyToneName = toneNames[personalDailyToneNumber - 1];

  const isDefaultName = !userName || userName.trim() === '';
  const dateParts = date.split('-');
  const formattedDate = `${dateParts[0]}/${parseInt(dateParts[1], 10)}/${parseInt(dateParts[2], 10)}`;

  // 🔥 更新：將親友紀錄安全地寫入雲端資料庫 🔥
  const handleSaveRecord = async () => {
    if (!userName.trim()) {
      alert("請先在上方輸入「姓名」才能儲存喔！");
      return;
    }

    if (!user) {
      alert("請先登入才能使用雲端儲存功能！");
      return;
    }

    const existingIndex = savedRecords.findIndex(r => r.name === userName.trim());
    // 產生專屬的文件 ID (如果已經存過，就沿用舊的 ID 進行覆蓋更新)
    const docId = existingIndex >= 0 ? savedRecords[existingIndex].id : Date.now().toString();

    const newRecordData = {
      name: userName.trim(),
      date: date,
      kin: kinNumber,
      sealName: mainSeal.name,
      toneName: currentToneName,
      timestamp: Date.now() // 加上時間戳記方便排序
    };

    try {
      // 1. 寫入 Firestore 雲端資料庫
      const docRef = doc(db, "users", user.uid, "records", docId);
      await setDoc(docRef, newRecordData);

      // 2. 更新前端畫面狀態
      let newRecords = [...savedRecords];
      const stateRecord = { id: docId, ...newRecordData };

      if (existingIndex >= 0) {
        newRecords[existingIndex] = stateRecord;
      } else {
        newRecords.unshift(stateRecord);
      }

      newRecords.sort((a, b) => b.timestamp - a.timestamp);
      setSavedRecords(newRecords);
      alert(`✅ 已成功將 ${userName.trim()} 的資料同步至雲端資料庫！`);

    } catch (error) {
      console.error("寫入雲端失敗:", error);
      alert("雲端儲存失敗，請檢查資料庫權限設定！");
    }
  };

  // 🔥 更新：從雲端資料庫真實刪除紀錄 🔥
  const handleDeleteRecord = async (idToRemove) => {
    try {
      // 1. 告訴雲端刪除這個檔案
      await deleteDoc(doc(db, "users", user.uid, "records", idToRemove));

      // 2. 把畫面上對應的資料拿掉
      const updatedRecords = savedRecords.filter(r => r.id !== idToRemove);
      setSavedRecords(updatedRecords);
    } catch (error) {
      console.error("刪除雲端紀錄失敗", error);
      alert("刪除失敗！請稍後再試。");
    }
  };

  const handleLoadRecord = (record) => {
    setUserName(record.name);
    setDate(record.date);
    setShowRecordsView(false); 
    setAiResponse(''); 
  };

  const handleGenerateGuidance = async () => {
    setIsAiLoading(true);
    setAiResponse('');

    try {
      const targetName = isDefaultName ? '這位星際旅人' : userName;

      const prompt = `你是一位專業且溫暖的瑪雅13月亮曆解讀師。
      使用者 ${targetName} 的主印記是：「KIN ${kinNumber} ${currentToneName}的${mainSeal.name}」。
      今天的宇宙流日印記是：「KIN ${todayKinNumber} ${todayToneName}的${todayMainSeal.name}」。
      根據瑪雅曆法合盤算法，這兩者結合而成的【個人專屬今日流日印記】為：「KIN ${personalDailyKin} ${personalDailyToneName}的${personalDailyMainSeal.name}」。
      請直接以這個專屬流日印記（KIN ${personalDailyKin}）的能量氛圍為核心，用 100 字以內，給 ${targetName} 一段今天專屬的行動建議與祝福。
      【重要指令】：請務必使用「繁體中文（台灣）」輸出，語氣要溫暖正向。不要輸出Markdown標題符號，直接給純文字建議即可。`;

      const apiKey = import.meta.env.VITE_GROQ_API_KEY;

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile", 
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7, 
          max_tokens: 250
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Groq API 請求失敗');
      }

      const data = await response.json();
      const text = data.choices[0].message.content;
      setAiResponse(text);

    } catch (error) {
      console.error("AI 發生錯誤:", error);
      setAiResponse(`【錯誤報告】請複製給工程師看：${error.message}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const downloadScreenshot = async () => {
    if (!captureRef.current) return;
    try {
      const canvas = await html2canvas(captureRef.current, { backgroundColor: null, scale: 2 });
      const image = canvas.toDataURL("image/png");
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        setPreviewImage(image);
      } else {
        const link = document.createElement('a');
        link.href = image;
        link.download = `${isDefaultName ? '今日' : userName}_印記.png`;
        link.click();
      }
    } catch (error) {
      console.error("截圖發生錯誤:", error);
    }
  };

  // --- 登入畫面 ---
  if (!user) {
    return (
      <div style={{ background: 'linear-gradient(135deg, #fff0f5 0%, #fce4ec 100%)', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', fontFamily: 'sans-serif' }}>
        <div style={{ backgroundColor: '#fff', padding: '40px 30px', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', width: '100%', maxWidth: '350px', textAlign: 'center' }}>
          <img src="/Bxc Balance LOGO.png" alt="LOGO" style={{ width: '100px', marginBottom: '20px' }} />
          <h2 style={{ color: '#d81b60', margin: '0 0 25px 0' }}>{isLoginMode ? '登入星系矩陣' : '註冊星際旅人'}</h2>
          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input type="email" placeholder="信箱 Email" required value={email} onChange={(e) => setEmail(e.target.value)} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #f8bbd0', outline: 'none' }} />
            <input type="password" placeholder="密碼 Password" required value={password} onChange={(e) => setPassword(e.target.value)} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #f8bbd0', outline: 'none' }} />
            {authError && <div style={{ color: 'red', fontSize: '12px', textAlign: 'left' }}>{authError}</div>}
            <button type="submit" style={{ padding: '12px', fontSize: '16px', fontWeight: 'bold', color: '#fff', backgroundColor: '#ec407a', border: 'none', borderRadius: '10px', cursor: 'pointer', marginTop: '10px' }}>{isLoginMode ? '登入' : '註冊'}</button>
          </form>
          <div style={{ margin: '20px 0', color: '#aaa', fontSize: '12px' }}>或</div>
          <button onClick={handleGoogleSignIn} style={{ width: '100%', padding: '12px', fontSize: '14px', fontWeight: 'bold', color: '#555', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '10px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
            <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" style={{ width: '18px' }} /> 使用 Google 繼續
          </button>
          <p style={{ marginTop: '25px', fontSize: '14px', color: '#666' }}>
            {isLoginMode ? '還沒有帳號嗎？ ' : '已經有帳號了？ '}
            <span onClick={() => setIsLoginMode(!isLoginMode)} style={{ color: '#d81b60', fontWeight: 'bold', cursor: 'pointer' }}>{isLoginMode ? '立即註冊' : '點此登入'}</span>
          </p>
        </div>
      </div>
    );
  }

  // --- 主畫面結構 ---
  return (
    <div style={{ background: 'linear-gradient(135deg, #fff0f5 0%, #fce4ec 100%)', minHeight: '100vh', padding: '15px', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

      {/* 頂端導覽列 */}
      <div style={{ width: '100%', maxWidth: '380px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <span style={{ fontSize: '12px', color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px' }}>Hi, {user.email}</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setShowRecordsView(!showRecordsView)} style={{ padding: '6px 10px', fontSize: '12px', backgroundColor: showRecordsView ? '#d81b60' : '#fff', border: '1px solid #d81b60', color: showRecordsView ? '#fff' : '#d81b60', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            {showRecordsView ? '✕ 返回神諭陣' : '📂 雲端紀錄庫'}
          </button>
          <button onClick={handleLogout} style={{ padding: '6px 10px', fontSize: '12px', backgroundColor: 'transparent', border: '1px solid #aaa', color: '#aaa', borderRadius: '8px', cursor: 'pointer' }}>登出</button>
        </div>
      </div>

      {/* 🔴 視圖 1：雲端親友紀錄庫清單 🔴 */}
      {showRecordsView ? (
        <div style={{ width: '100%', maxWidth: '380px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h3 style={{ color: '#d81b60', margin: '0 0 10px 0', textAlign: 'center' }}>☁️ 雲端親友資料庫</h3>

          {savedRecords.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', backgroundColor: '#fff', borderRadius: '15px', color: '#888' }}>
              尚未儲存任何親友紀錄。<br/>請至神諭陣輸入資料並按下「儲存紀錄」。
            </div>
          ) : (
            savedRecords.map(record => (
              <div key={record.id} style={{ backgroundColor: '#fff', borderRadius: '15px', padding: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#333' }}>{record.name}</span>
                  <span style={{ fontSize: '12px', color: '#888' }}>{record.date}</span>
                  <span style={{ fontSize: '12px', color: '#3949ab', fontWeight: 'bold' }}>KIN {record.kin} {record.toneName}的{record.sealName}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button onClick={() => handleLoadRecord(record)} style={{ padding: '6px 15px', fontSize: '12px', backgroundColor: '#e3f2fd', color: '#1976d2', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>載入</button>
                  <button onClick={() => handleDeleteRecord(record.id)} style={{ padding: '6px 15px', fontSize: '12px', backgroundColor: '#ffebee', color: '#d32f2f', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>刪除</button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* 🔴 視圖 2：主神諭陣計算器 🔴 */
        <>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', marginBottom: '20px', width: '100%', maxWidth: '380px', boxSizing: 'border-box' }}>
            <h2 style={{ color: '#d81b60', margin: '0' }}>13月亮曆印記查詢</h2>
            <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
              <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="請輸入名字" style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #f8bbd0', outline: 'none', boxSizing: 'border-box', minWidth: '0' }} />
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #f8bbd0', outline: 'none', boxSizing: 'border-box', minWidth: '0' }} />
            </div>

            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
              <button onClick={handleGenerateGuidance} disabled={isAiLoading} style={{ flex: 1, padding: '10px 5px', fontSize: '13px', fontWeight: 'bold', color: '#fff', backgroundColor: '#ab47bc', border: 'none', borderRadius: '8px', cursor: isAiLoading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 10px rgba(171, 71, 188, 0.3)', boxSizing: 'border-box' }}>
                {isAiLoading ? '解析中...' : '✨ 今日解析'}
              </button>
              <button onClick={downloadScreenshot} style={{ flex: 1, padding: '10px 5px', fontSize: '13px', fontWeight: 'bold', color: '#fff', backgroundColor: '#ec407a', border: 'none', borderRadius: '8px', cursor: 'pointer', boxShadow: '0 4px 10px rgba(236, 64, 122, 0.3)', boxSizing: 'border-box' }}>
                📸 另存圖片
              </button>
              <button onClick={handleSaveRecord} style={{ flex: 1, padding: '10px 5px', fontSize: '13px', fontWeight: 'bold', color: '#fff', backgroundColor: '#26a69a', border: 'none', borderRadius: '8px', cursor: 'pointer', boxShadow: '0 4px 10px rgba(38, 166, 154, 0.3)', boxSizing: 'border-box' }}>
                💾 雲端儲存
              </button>
            </div>
          </div>

          <div ref={captureRef} style={{ backgroundColor: '#ffffff', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', width: '100%', maxWidth: '380px', padding: '25px 15px 15px 15px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

            <div style={{ textAlign: 'center', marginTop: '5px', marginBottom: '25px' }}>
              <div style={{ fontSize: '16px', color: '#f06292', letterSpacing: '2px', marginBottom: '8px' }}>✨ 星系矩陣 ✨</div>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                {isDefaultName ? '今日的主印記' : `${userName}的主印記`} {formattedDate}
              </div>
              <div style={{ fontSize: '26px', fontWeight: '800', color: '#3949ab', marginBottom: '8px' }}>KIN {kinNumber}</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#5c6bc0', marginBottom: '12px' }}>
                {currentToneName}的{mainSeal.name}
              </div>
              <div style={{ backgroundColor: '#fcf3e3', color: '#b98f48', padding: '6px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', display: 'inline-block' }}>
                {wavespellSeal.name}波符
              </div>
            </div>

            <div style={{ position: 'relative', border: '2px solid #e8eaf6', borderRadius: '20px', padding: '25px', backgroundColor: '#fafbff', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(3, auto)', gap: '15px', alignItems: 'center', justifyItems: 'center', width: '100%', boxSizing: 'border-box' }}>
              <div style={{ gridArea: '1 / 1 / 2 / 2', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><img src={wavespellSeal.img} alt="波符" style={{ width: '32px' }} /><span style={labelStyle}>波符：{wavespellSeal.name}</span></div>
              <div style={{ gridArea: '1 / 2 / 2 / 3', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><img src={guideSeal.img} alt="引導" style={{ width: '48px' }} /><span style={labelStyle}>引導：{guideSeal.name}</span></div>
              <div style={{ gridArea: '2 / 1 / 3 / 2', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><img src={challengeSeal.img} alt="挑戰" style={{ width: '48px' }} /><span style={labelStyle}>挑戰：{challengeSeal.name}</span></div>
              <div style={{ gridArea: '2 / 2 / 3 / 3', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><img src={`/tone_${toneNumber}.png`} alt={`調性 ${toneNumber}`} style={{ height: '12px', marginBottom: '6px', objectFit: 'contain' }} /><img src={mainSeal.img} alt="主印記" style={{ width: '72px' }} /><img src={`/tone_${bottomToneNumber}.png`} alt={`推動調性 ${bottomToneNumber}`} style={{ height: '12px', marginTop: '6px', objectFit: 'contain' }} /><span style={labelStyle}>{mainSeal.name}</span></div>
              <div style={{ gridArea: '2 / 3 / 3 / 4', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><img src={supportSeal.img} alt="支持" style={{ width: '48px' }} /><span style={labelStyle}>支持：{supportSeal.name}</span></div>
              <div style={{ gridArea: '3 / 2 / 4 / 3', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><img src={hiddenSeal.img} alt="隱藏推動" style={{ width: '48px' }} /><span style={labelStyle}>隱藏推動：{hiddenSeal.name}</span></div>
            </div>

            <div style={reportCardStyle}>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#3949ab', marginBottom: '15px' }}>基礎能量配置</div>

              <div style={reportRowStyle}>
                <div style={reportLabelStyle}>所屬城堡</div>
                <div style={{ ...reportValueStyle, color: castleColor }}>⬤ {castleName}</div>
              </div>
              <div style={reportRowStyle}>
                <div style={reportLabelStyle}>地球家族</div>
                <div style={reportValueStyle}>{earthFamilyName}</div>
              </div>
              <div style={reportRowStyle}>
                <div style={reportLabelStyle}>引導</div>
                <div style={{...reportValueStyle, color: '#1976d2'}}>{guideSeal.name}</div>
              </div>
              <div style={reportRowStyle}>
                <div style={reportLabelStyle}>支持</div>
                <div style={{...reportValueStyle, color: '#fbc02d'}}>{supportSeal.name}</div>
              </div>
              <div style={reportRowStyle}>
                <div style={reportLabelStyle}>挑戰</div>
                <div style={{...reportValueStyle, color: '#d32f2f'}}>{challengeSeal.name}</div>
              </div>
              <div style={{...reportRowStyle, borderBottom: 'none'}}>
                <div style={reportLabelStyle}>推動</div>
                <div style={{...reportValueStyle, color: '#757575'}}>{fullHiddenName} (Kin {fullHiddenKin})</div>
              </div>
            </div>

            {aiResponse && (
              <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f3e5f5', borderRadius: '15px', border: '1px solid #e1bee7', width: '100%', boxSizing: 'border-box' }}>
                <h4 style={{ color: '#8e24aa', margin: '0 0 8px 0', fontSize: '14px', textAlign: 'center' }}>✨ 今日宇宙導航</h4>
                <p style={{ color: '#4a148c', fontSize: '13px', lineHeight: '1.6', margin: 0, textAlign: 'justify' }}>
                  {aiResponse}
                </p>
              </div>
            )}

            <div style={{ marginTop: '20px', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <img src="/Bxc Balance LOGO.png" alt="Bxc Balance LOGO" style={{ width: '120px', height: 'auto', opacity: 0.8, transform: 'translateX(-10px)' }} />
            </div>
          </div>
        </>
      )}

      {/* 截圖預覽遮罩 */}
      {previewImage && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', boxSizing: 'border-box' }}>
          <p style={{ color: '#fff', fontSize: '18px', fontWeight: 'bold', marginBottom: '20px', letterSpacing: '1px' }}>📱 請長按下方圖片即可儲存</p>
          <img src={previewImage} alt="專屬圖卡預覽" style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: '15px', boxShadow: '0 4px 25px rgba(0,0,0,0.5)' }} />
          <button onClick={() => setPreviewImage(null)} style={{ marginTop: '25px', padding: '12px 35px', fontSize: '16px', borderRadius: '30px', border: 'none', backgroundColor: '#fff', color: '#d81b60', fontWeight: 'bold', cursor: 'pointer' }}>✕ 關閉預覽</button>
        </div>
      )}
    </div>
  );
}