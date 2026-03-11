import React, { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import './App.css';

import liff from '@line/liff';
import { auth, db } from './firebase'; 
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, doc, setDoc, getDocs, deleteDoc } from 'firebase/firestore';

// 🚀 匯入您辛苦建置的 441 矩陣資料庫
import { timeMatrix, spaceMatrix, synchronicMatrix } from './Matrix441';

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

// 🚀 13 月亮曆 PSI 查表大字典
const advancedMatrixData = {
  "1-1":1, "1-2":1, "1-3":1, "1-4":20, "1-5":20, "1-6":20, "1-7":2, "1-8":3, "1-9":4, "1-10":5, "1-11":6, "1-12":7, "1-13":8, "1-14":9, "1-15":10, "1-16":11, "1-17":12, "1-18":13, "1-19":14, "1-20":15, "1-21":16, "1-22":17, "1-23":241, "1-24":241, "1-25":241, "1-26":260, "1-27":260, "1-28":260,
  "2-1":22, "2-2":22, "2-3":22, "2-4":39, "2-5":39, "2-6":39, "2-7":18, "2-8":19, "2-9":21, "2-10":23, "2-11":24, "2-12":25, "2-13":26, "2-14":27, "2-15":28, "2-16":29, "2-17":30, "2-18":31, "2-19":32, "2-20":33, "2-21":34, "2-22":35, "2-23":222, "2-24":222, "2-25":222, "2-26":239, "2-27":239, "2-28":239,
  "3-1":43, "3-2":43, "3-3":43, "3-4":58, "3-5":58, "3-6":58, "3-7":36, "3-8":37, "3-9":38, "3-10":40, "3-11":41, "3-12":42, "3-13":44, "3-14":45, "3-15":46, "3-16":47, "3-17":48, "3-18":49, "3-19":52, "3-20":53, "3-21":54, "3-22":55, "3-23":203, "3-24":203, "3-25":203, "3-26":218, "3-27":218, "3-28":218,
  "4-1":64, "4-2":64, "4-3":64, "4-4":96, "4-5":96, "4-6":96, "4-7":56, "4-8":57, "4-9":59, "4-10":60, "4-11":61, "4-12":62, "4-13":63, "4-14":65, "4-15":66, "4-16":67, "4-17":68, "4-18":70, "4-19":71, "4-20":73, "4-21":74, "4-22":75, "4-23":210, "4-24":210, "4-25":210, "4-26":197, "4-27":197, "4-28":197,
  "5-1":85, "5-2":85, "5-3":85, "5-4":77, "5-5":77, "5-6":77, "5-7":76, "5-8":78, "5-9":79, "5-10":80, "5-11":81, "5-12":82, "5-13":83, "5-14":84, "5-15":86, "5-16":87, "5-17":89, "5-18":90, "5-19":91, "5-20":92, "5-21":94, "5-22":95, "5-23":184, "5-24":184, "5-25":184, "5-26":176, "5-27":176, "5-28":176,
  "6-1":69, "6-2":69, "6-3":69, "6-4":72, "6-5":72, "6-6":72, "6-7":97, "6-8":98, "6-9":99, "6-10":100, "6-11":101, "6-12":102, "6-13":103, "6-14":104, "6-15":105, "6-16":116, "6-17":117, "6-18":118, "6-19":119, "6-20":120, "6-21":121, "6-22":122, "6-23":189, "6-24":189, "6-25":189, "6-26":192, "6-27":192, "6-28":192,
  "7-1":50, "7-2":50, "7-3":50, "7-4":51, "7-5":51, "7-6":51, "7-7":123, "7-8":124, "7-9":125, "7-10":126, "7-11":127, "7-12":128, "7-13":129, "7-14":130, "7-15":131, "7-16":132, "7-17":133, "7-18":134, "7-19":135, "7-20":136, "7-21":137, "7-22":138, "7-23":165, "7-24":165, "7-25":165, "7-26":211, "7-27":211, "7-28":211,
  "8-1":88, "8-2":88, "8-3":88, "8-4":93, "8-5":93, "8-6":93, "8-7":139, "8-8":140, "8-9":141, "8-10":142, "8-11":143, "8-12":144, "8-13":145, "8-14":156, "8-15":157, "8-16":158, "8-17":159, "8-18":160, "8-19":161, "8-20":162, "8-21":163, "8-22":164, "8-23":168, "8-24":168, "8-25":168, "8-26":173, "8-27":173, "8-28":173,
  "9-1":106, "9-2":106, "9-3":106, "9-4":115, "9-5":115, "9-6":115, "9-7":166, "9-8":167, "9-9":169, "9-10":170, "9-11":171, "9-12":172, "9-13":174, "9-14":175, "9-15":177, "9-16":178, "9-17":179, "9-18":180, "9-19":181, "9-20":182, "9-21":183, "9-22":185, "9-23":146, "9-24":146, "9-25":146, "9-26":155, "9-27":155, "9-28":155,
  "10-1":107, "10-2":107, "10-3":107, "10-4":114, "10-5":114, "10-6":114, "10-7":186, "10-8":187, "10-9":188, "10-10":190, "10-11":191, "10-12":193, "10-13":194, "10-14":195, "10-15":196, "10-16":198, "10-17":199, "10-18":200, "10-19":201, "10-20":202, "10-21":204, "10-22":205, "10-23":147, "10-24":147, "10-25":147, "10-26":154, "10-27":154, "10-28":154,
  "11-1":108, "11-2":108, "11-3":108, "11-4":113, "11-5":113, "11-6":113, "11-7":206, "11-8":207, "11-9":208, "11-10":209, "11-11":212, "11-12":213, "11-13":214, "11-14":215, "11-15":216, "11-16":217, "11-17":219, "11-18":220, "11-19":221, "11-20":223, "11-21":224, "11-22":225, "11-23":148, "11-24":148, "11-25":148, "11-26":153, "11-27":153, "11-28":153,
  "12-1":109, "12-2":109, "12-3":109, "12-4":112, "12-5":112, "12-6":112, "12-7":226, "12-8":227, "12-9":228, "12-10":229, "12-11":230, "12-12":231, "12-13":232, "12-14":233, "12-15":234, "12-16":235, "12-17":236, "12-18":237, "12-19":238, "12-20":240, "12-21":242, "12-22":243, "12-23":149, "12-24":149, "12-25":149, "12-26":152, "12-27":152, "12-28":152,
  "13-1":110, "13-2":110, "13-3":110, "13-4":111, "13-5":111, "13-6":111, "13-7":244, "13-8":245, "13-9":246, "13-10":247, "13-11":248, "13-12":249, "13-13":250, "13-14":251, "13-15":252, "13-16":253, "13-17":254, "13-18":255, "13-19":256, "13-20":257, "13-21":258, "13-22":259, "13-23":150, "13-24":150, "13-25":150, "13-26":151, "13-27":151, "13-28":151
};

// 🚀 光點密碼解鎖：Hunab Ku 21 矩陣的等離子與圖騰對應 BMU
const plasmasBMU = [108, 291, 144, 315, 414, 402, 441]; 
const archetypeBMUs = [414, 108, 144, 126, 90, 288, 294, 291, 300, 306, 303, 312, 318, 315, 276, 282, 279, 396, 402, 408]; 

// ✨ 全域 Helper 函數
const getGuideIndex = (main, tone) => {
  const shifts = { 1: 0, 6: 0, 11: 0, 2: 12, 7: 12, 12: 12, 3: 4, 8: 4, 13: 4, 4: 16, 9: 16, 5: 8, 10: 8 };
  return (main + shifts[tone]) % 20;
};

const getSealColor = (index) => {
  const colors = ["#fbc02d", "#d32f2f", "#757575", "#1976d2"]; 
  return colors[index % 4];
};

const getAdvancedKinDetails = (calculatedKin) => {
  if (!calculatedKin) return { name: "", color: "#333" };
  const tone = ((calculatedKin - 1) % 13) + 1;
  const sealIndex = calculatedKin % 20;
  const seal = seals[sealIndex];
  const name = `${toneNames[tone - 1]}${seal.name}`;
  const color = getSealColor(sealIndex);
  return { kin: calculatedKin, name, color };
};

// ✨ 取得五大神諭詳細圖騰資料的引擎 (供迷你四宮格使用)
const getOracleDetails = (kin) => {
  if (!kin) return null;
  const tone = ((kin - 1) % 13) + 1;
  const bottomTone = 14 - tone;
  const mainIdx = kin % 20;
  const challengeIdx = (mainIdx + 10) % 20;
  const supportIdx = (39 - mainIdx) % 20;
  const hiddenIdx = (21 - mainIdx) % 20;
  const guideIdx = getGuideIndex(mainIdx, tone);
  const wavespellIdx = (mainIdx - (tone - 1) + 260) % 20;

  return {
    tone,
    bottomTone,
    mainSeal: seals[mainIdx],
    guideSeal: seals[guideIdx],
    challengeSeal: seals[challengeIdx],
    supportSeal: seals[supportIdx],
    hiddenSeal: seals[hiddenIdx],
    wavespellSeal: seals[wavespellIdx]
  };
};

// 🌟 絕美迷你神諭卡元件 (粉色版)
const MiniOracleCard = ({ title, kinNum, kinDetails, oracleDetails }) => {
  if (!kinNum || !oracleDetails) {
    return (
      <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '12px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px solid #f8bbd0', boxShadow: '0 4px 10px rgba(216, 27, 96, 0.05)', minHeight: '150px' }}>
        <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px', fontWeight: 'bold' }}>{title}</div>
        <div style={{ fontSize: '12px', color: '#aaa', marginTop: '6px' }}>🔒 待解鎖</div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '12px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', border: '1px solid #f8bbd0', boxShadow: '0 4px 10px rgba(216, 27, 96, 0.05)' }}>
      <div style={{ fontSize: '11px', color: '#888', marginBottom: '2px', fontWeight: 'bold', letterSpacing: '0.5px' }}>{title} KIN {kinNum}</div>
      <div style={{ fontSize: '12px', fontWeight: 'bold', color: kinDetails.color, marginBottom: '12px' }}>{kinDetails.name}</div>
      
      {/* 迷你十字排版 (無文字版) */}
      <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(3, auto)', gap: '6px', alignItems: 'center', justifyItems: 'center', width: '100%' }}>
        <div style={{ gridArea: '1 / 1 / 2 / 2', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img src={oracleDetails.wavespellSeal.img} alt="波符" style={{ width: '18px', opacity: 0.8 }} />
        </div>
        <div style={{ gridArea: '1 / 2 / 2 / 3', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img src={oracleDetails.guideSeal.img} alt="引導" style={{ width: '28px' }} />
        </div>
        <div style={{ gridArea: '2 / 1 / 3 / 2', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img src={oracleDetails.challengeSeal.img} alt="挑戰" style={{ width: '28px' }} />
        </div>
        <div style={{ gridArea: '2 / 2 / 3 / 3', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img src={`/tone_${oracleDetails.tone}.png`} alt="調性" style={{ height: '8px', marginBottom: '4px', objectFit: 'contain' }} />
          <img src={oracleDetails.mainSeal.img} alt="主印記" style={{ width: '42px' }} />
          <img src={`/tone_${oracleDetails.bottomTone}.png`} alt="推動調性" style={{ height: '8px', marginTop: '4px', objectFit: 'contain' }} />
        </div>
        <div style={{ gridArea: '2 / 3 / 3 / 4', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img src={oracleDetails.supportSeal.img} alt="支持" style={{ width: '28px' }} />
        </div>
        <div style={{ gridArea: '3 / 2 / 4 / 3', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img src={oracleDetails.hiddenSeal.img} alt="隱藏推動" style={{ width: '28px' }} />
        </div>
      </div>
    </div>
  );
};


const labelStyle = { fontSize: '11px', color: '#888', marginTop: '4px', fontWeight: 'normal', whiteSpace: 'nowrap' };

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
  const [isInitializing, setIsInitializing] = useState(true); 

  const [isLoginMode, setIsLoginMode] = useState(true); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [lineProfile, setLineProfile] = useState(null);
  const [date, setDate] = useState(getTodayString());
  const [userName, setUserName] = useState(''); 
  const captureRef = useRef(null); 
  const [previewImage, setPreviewImage] = useState(null);
  const [aiResponse, setAiResponse] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [savedRecords, setSavedRecords] = useState([]);
  const [showRecordsView, setShowRecordsView] = useState(false);

  const [activeTab, setActiveTab] = useState('query'); 
  const [selectedRecordId, setSelectedRecordId] = useState('current'); 

  useEffect(() => {
    let isMounted = true;
    const fallbackTimer = setTimeout(() => {
      if (isMounted) setIsInitializing(false);
    }, 3000);

    const initLiff = async () => {
      try {
        await liff.init({ liffId: '2009406742-2WUZO3mQ' });
        if (liff.isLoggedIn()) {
          const profile = await liff.getProfile();
          setLineProfile(profile);
          const lineEmail = `${profile.userId}@line.bxc.com`;
          const linePassword = `Liff_${profile.userId}_Secret`; 
          try {
            await signInWithEmailAndPassword(auth, lineEmail, linePassword);
          } catch (error) {
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-login-credentials') {
              try {
                 await createUserWithEmailAndPassword(auth, lineEmail, linePassword);
              } catch (regError) {
                 console.error("Firebase 自動註冊失敗", regError);
              }
            }
          }
        }
      } catch (err) {
        console.error("LIFF 初始化失敗", err);
      } finally {
        if (isMounted) setIsInitializing(false);
        clearTimeout(fallbackTimer);
      }
    };
    initLiff();
    return () => {
      isMounted = false;
      clearTimeout(fallbackTimer);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setIsInitializing(false); 
        const savedName = localStorage.getItem(`maya_name_${currentUser.uid}`);
        const savedDate = localStorage.getItem(`maya_date_${currentUser.uid}`);
        if (savedName) setUserName(savedName);
        if (savedDate) setDate(savedDate);

        try {
          const recordsRef = collection(db, "users", currentUser.uid, "records");
          const snapshot = await getDocs(recordsRef);
          const cloudRecords = snapshot.docs.map(doc => ({
            id: doc.id, ...doc.data()
          }));
          cloudRecords.sort((a, b) => b.timestamp - a.timestamp);
          setSavedRecords(cloudRecords);
        } catch (error) {
          console.error("載入雲端紀錄失敗", error);
        }
      } else {
        setSavedRecords([]); 
      }
    });
    return () => unsubscribe();
  }, []);

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

  const handleLineLogin = () => {
    if (!liff.isLoggedIn()) liff.login();
  };

  const get13MoonDateInfo = (inputDate) => {
    const dateObj = new Date(inputDate + 'T00:00:00Z');
    let year = dateObj.getUTCFullYear();
    let startYear = year;
    if (dateObj.getUTCMonth() < 6 || (dateObj.getUTCMonth() === 6 && dateObj.getUTCDate() < 26)) {
      startYear--;
    }
    const startDate = new Date(Date.UTC(startYear, 6, 26)); 
    const diffTime = Math.abs(dateObj - startDate);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 364) return { display: "無時間日 (Day Out of Time)", key: "0-0", moon: 0, day: 0 };
    
    const moon = Math.floor(diffDays / 28) + 1;
    const day = (diffDays % 28) + 1;
    const moonNames = ["磁性", "月亮", "電力", "自我存在", "超頻", "韻律", "共鳴", "銀河星系", "太陽", "行星", "光譜", "水晶", "宇宙"];
    
    return {
      display: `${moonNames[moon - 1]}之月 第 ${day} 天`,
      key: `${moon}-${day}`,
      moon: moon,
      day: day
    };
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

  const getKinFromIndexAndTone = (sealIdx, tone) => {
    for (let k = 1; k <= 260; k++) {
      if (k % 20 === sealIdx && ((k - 1) % 13) + 1 === tone) return k;
    }
    return 260;
  };

  const moonInfo = get13MoonDateInfo(date);
  const moonDateDisplay = moonInfo.display;
  const psiKinNum = advancedMatrixData[moonInfo.key];

  const guideKinNum = getKinFromIndexAndTone(guideIndex, toneNumber);
  const supportKinNum = getKinFromIndexAndTone(supportIndex, toneNumber);
  const challengeKinNum = getKinFromIndexAndTone(challengeIndex, toneNumber);
  const hiddenKinNum = getKinFromIndexAndTone(hiddenIndex, bottomToneNumber);
  const goddessKinNum = (kinNumber + guideKinNum + supportKinNum + challengeKinNum + hiddenKinNum) % 260 || 260;
  const goddessKinDetails = getAdvancedKinDetails(goddessKinNum);

  // 🚀 核心封神演算法：MCF 疊加與 HK21
  let eqKinNum = null;
  let eqKinDetails = { name: "🔒 待解鎖", color: "#aaa" };
  let baseMatrixUnit = "🔒 待解鎖"; 
  let hk21KinNum = null;
  let hk21Details = { name: "🔒 待解鎖", color: "#aaa" };

  if (moonInfo.moon > 0 && timeMatrix && spaceMatrix && synchronicMatrix) {
    const getTelektononCoordinate = (m, d) => {
      let r, c, topR, botR;
      if (m <= 7) { topR = m - 1; botR = m + 13; } 
      else { topR = 13 - m; botR = 27 - m; } 
      const isMirrored = m >= 8 && m <= 13;

      if (d >= 1 && d <= 7) { r = isMirrored ? botR : topR; c = isMirrored ? 20 - (d - 1) : d - 1; }
      else if (d >= 8 && d <= 14) { r = isMirrored ? botR : topR; c = isMirrored ? 6 - (d - 8) : 14 + (d - 8); }
      else if (d >= 15 && d <= 21) { r = isMirrored ? topR : botR; c = isMirrored ? 20 - (d - 15) : d - 15; }
      else { r = isMirrored ? topR : botR; c = isMirrored ? 6 - (d - 22) : 14 + (d - 22); }
      return { r, c };
    };

    const getSpaceCoordinate = (k) => {
      for (let r = 0; r < 21; r++) for (let c = 0; c < 21; c++) if (spaceMatrix[r][c] === k) return { r, c };
      return { r: 0, c: 0 };
    };

    const getSynchronicCoordinate = (k) => {
      for (let r = 0; r < 21; r++) {
        if (r === 10) continue; 
        for (let c = 4; c <= 16; c++) if (synchronicMatrix[r][c] === k) return { r, c };
      }
      return { r: 0, c: 0 };
    };

    const c1 = getTelektononCoordinate(moonInfo.moon, moonInfo.day);
    const c2 = getSpaceCoordinate(kinNumber);
    const c3 = getSynchronicCoordinate(kinNumber);

    const val1 = timeMatrix[c1.r][c1.c] + spaceMatrix[c1.r][c1.c] + synchronicMatrix[c1.r][c1.c];
    const val2 = timeMatrix[c2.r][c2.c] + spaceMatrix[c2.r][c2.c] + synchronicMatrix[c2.r][c2.c];
    const val3 = timeMatrix[c3.r][c3.c] + spaceMatrix[c3.r][c3.c] + synchronicMatrix[c3.r][c3.c];

    const mcf = val1 + val2 + val3;

    eqKinNum = mcf % 260 || 260;
    eqKinDetails = getAdvancedKinDetails(eqKinNum);
    baseMatrixUnit = mcf % 441 || 441;

    const plasmaIndex = (moonInfo.day - 1) % 7;
    const plasmaBMU = plasmasBMU[plasmaIndex];
    const hk21Sum = archetypeBMUs[mainIndex] + archetypeBMUs[guideIndex] + archetypeBMUs[supportIndex] + archetypeBMUs[challengeIndex] + archetypeBMUs[hiddenIndex] + plasmaBMU;

    hk21KinNum = hk21Sum % 260 || 260;
    hk21Details = getAdvancedKinDetails(hk21KinNum);
  }

  const todayDateString = getTodayString();
  const todayKinNumber = calculateKin(todayDateString);
  const todayToneNumber = ((todayKinNumber - 1) % 13) + 1;
  const todayMainIndex = todayKinNumber % 20;
  const todayMainSeal = seals[todayMainIndex];
  const todayToneName = toneNames[todayToneNumber - 1];

  const todayBottomToneNumber = 14 - todayToneNumber;
  const todayGuideIndex = getGuideIndex(todayMainIndex, todayToneNumber);
  const todayChallengeIndex = (todayMainIndex + 10) % 20; 
  const todaySupportIndex = (39 - todayMainIndex) % 20;
  const todayHiddenIndex = (21 - todayMainIndex) % 20;
  const todayWavespellIndex = (todayMainIndex - (todayToneNumber - 1) + 260) % 20;

  const tGuideSeal = seals[todayGuideIndex];
  const tChallengeSeal = seals[todayChallengeIndex];
  const tSupportSeal = seals[todaySupportIndex];
  const tHiddenSeal = seals[todayHiddenIndex];
  const tWavespellSeal = seals[todayWavespellIndex];

  const earthFamilyIndex = mainIndex % 5;
  const earthFamilyName = earthFamilies[earthFamilyIndex];
  const castleIndex = Math.floor((kinNumber - 1) / 52);
  const castleName = castles[castleIndex];
  const castleColor = castleColors[castleIndex];

  const fullHiddenKin = 261 - kinNumber;
  const fullHiddenTone = ((fullHiddenKin - 1) % 13) + 1;
  const fullHiddenSeal = seals[fullHiddenKin % 20];
  const fullHiddenName = `${toneNames[fullHiddenTone - 1]}的${fullHiddenSeal.name}`;

  const isDefaultName = !userName || userName.trim() === '';
  const dateParts = date.split('-');
  const formattedDate = `${dateParts[0]}/${parseInt(dateParts[1], 10)}/${parseInt(dateParts[2], 10)}`;

  const handleSaveRecord = async () => {
    if (!userName.trim()) return alert("請先在上方輸入「姓名」才能儲存喔！");
    if (!user) return alert("請先登入才能使用雲端儲存功能！");

    const existingIndex = savedRecords.findIndex(r => r.name === userName.trim());
    const docId = existingIndex >= 0 ? savedRecords[existingIndex].id : Date.now().toString();

    const newRecordData = {
      name: userName.trim(), date: date, kin: kinNumber,
      sealName: mainSeal.name, toneName: currentToneName, timestamp: Date.now()
    };

    try {
      await setDoc(doc(db, "users", user.uid, "records", docId), newRecordData);
      let newRecords = [...savedRecords];
      const stateRecord = { id: docId, ...newRecordData };
      if (existingIndex >= 0) newRecords[existingIndex] = stateRecord;
      else newRecords.unshift(stateRecord);

      newRecords.sort((a, b) => b.timestamp - a.timestamp);
      setSavedRecords(newRecords);
      alert(`✅ 已成功將 ${userName.trim()} 的資料同步至雲端資料庫！`);
    } catch (error) {
      console.error("寫入雲端失敗:", error);
      alert("雲端儲存失敗，請檢查資料庫權限設定！");
    }
  };

  const handleDeleteRecord = async (idToRemove) => {
    try {
      await deleteDoc(doc(db, "users", user.uid, "records", idToRemove));
      setSavedRecords(savedRecords.filter(r => r.id !== idToRemove));
    } catch (error) {
      console.error("刪除雲端紀錄失敗", error);
    }
  };

  const handleLoadRecord = (record) => {
    setUserName(record.name);
    setDate(record.date);
    setShowRecordsView(false); 
    setActiveTab('query'); 
    setSelectedRecordId('current'); 
  };

  const handleGenerateGuidance = async () => {
    setIsAiLoading(true);
    setAiResponse('');
    
    try {
      let targetName, targetKin, targetToneName, targetSealName;

      if (selectedRecordId === 'current') {
        targetName = isDefaultName ? '這位星際旅人' : userName;
        targetKin = kinNumber;
        targetToneName = currentToneName;
        targetSealName = mainSeal.name;
      } else {
        const record = savedRecords.find(r => r.id === selectedRecordId);
        if (!record) throw new Error("找不到該筆親友資料");
        targetName = record.name;
        targetKin = record.kin;
        targetToneName = record.toneName;
        targetSealName = record.sealName;
      }

      let pDailyKin = (targetKin + todayKinNumber) % 260;
      if (pDailyKin === 0) pDailyKin = 260;
      const pDailyToneNumber = ((pDailyKin - 1) % 13) + 1;
      const pDailyMainSeal = seals[pDailyKin % 20];
      const pDailyToneName = toneNames[pDailyToneNumber - 1];

      const prompt = `你是一位專業且溫暖的瑪雅13月亮曆解讀師。
      使用者 ${targetName} 的主印記是：「KIN ${targetKin} ${targetToneName}的${targetSealName}」。
      今天的宇宙流日印記是：「KIN ${todayKinNumber} ${todayToneName}的${todayMainSeal.name}」。
      根據瑪雅曆法合盤算法，這兩者結合而成的【個人專屬今日流日印記】為：「KIN ${pDailyKin} ${pDailyToneName}的${pDailyMainSeal.name}」。
      請直接以這個專屬流日印記（KIN ${pDailyKin}）的能量氛圍為核心，用 100 字以內，給 ${targetName} 一段今天專屬的行動建議與祝福。
      【重要指令】：請務必使用「繁體中文（台灣）」輸出，語氣要溫暖正向。不要輸出Markdown標題符號，直接給純文字建議即可。`;

      const apiKey = import.meta.env.VITE_GROQ_API_KEY;
      
      let data = null;
      let lastError = null;
      
      for (let i = 0; i < 2; i++) {
        try {
          const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "llama-3.3-70b-versatile", messages: [{ role: "user", content: prompt }],
              temperature: 0.7, max_tokens: 250
            })
          });

          if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error?.message || 'API 請求失敗');
          }
          
          data = await response.json();
          break; 
        } catch (error) {
          lastError = error;
          if (i === 0) await new Promise(res => setTimeout(res, 500)); 
        }
      }

      if (!data) throw lastError;
      
      setAiResponse(data.choices[0].message.content);
    } catch (error) {
      setAiResponse(`【宇宙能量連線不穩】AI 正在甦醒中，請再按一次「今日分析」按鈕！`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const downloadScreenshot = async () => {
    if (!captureRef.current) return;
    try {
      const canvas = await html2canvas(captureRef.current, { backgroundColor: null, scale: 2 });
      const image = canvas.toDataURL("image/png");
      if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) setPreviewImage(image);
      else {
        const link = document.createElement('a');
        link.href = image;
        link.download = `${isDefaultName ? '今日' : userName}_印記.png`;
        link.click();
      }
    } catch (error) {
      console.error("截圖發生錯誤:", error);
    }
  };

  if (isInitializing) {
    return (
      <div style={{ background: 'linear-gradient(135deg, #fff0f5 0%, #fce4ec 100%)', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        <img src="/Bxc Balance LOGO.png" alt="LOGO" style={{ width: '100px', marginBottom: '25px', opacity: 0.8 }} />
        <h3 style={{ color: '#d81b60', margin: '0 0 10px 0', letterSpacing: '2px' }}>✨ 宇宙能量讀取中 ✨</h3>
        <p style={{ color: '#888', fontSize: '13px' }}>正在為您建立專屬星系矩陣通道...</p>
      </div>
    );
  }

  return (
    <div style={{ background: 'linear-gradient(135deg, #fff0f5 0%, #fce4ec 100%)', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: 'sans-serif' }}>

      {!user ? (
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', width: '100%' }}>
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
            
            <button type="button" onClick={handleLineLogin} style={{ width: '100%', padding: '12px', fontSize: '15px', fontWeight: 'bold', color: '#fff', backgroundColor: '#06C755', border: 'none', borderRadius: '10px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>💬</span>
              使用 LINE 一鍵登入
            </button>

            <p style={{ marginTop: '25px', fontSize: '14px', color: '#666' }}>
              {isLoginMode ? '還沒有帳號嗎？ ' : '已經有帳號了？ '}
              <span onClick={() => setIsLoginMode(!isLoginMode)} style={{ color: '#d81b60', fontWeight: 'bold', cursor: 'pointer' }}>{isLoginMode ? '立即註冊' : '點此登入'}</span>
            </p>
          </div>
        </div>
      ) : (
        <div style={{ padding: '15px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          
          <div style={{ width: '100%', maxWidth: '380px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', padding: '0 5px', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {lineProfile ? (
                <>
                  <img src={lineProfile.pictureUrl} alt="頭貼" style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid #f8bbd0', objectFit: 'cover' }} />
                  <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#d81b60' }}>
                    Hi, {lineProfile.displayName}
                  </span>
                </>
              ) : (
                <span style={{ fontSize: '14px', color: '#888' }}>Hi, 旅人</span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setShowRecordsView(!showRecordsView)} style={{ padding: '6px 10px', fontSize: '12px', backgroundColor: showRecordsView ? '#d81b60' : '#fff', border: '1px solid #d81b60', color: showRecordsView ? '#fff' : '#d81b60', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                {showRecordsView ? '✕ 返回系統' : '📂 雲端紀錄庫'}
              </button>
            </div>
          </div>

          {!showRecordsView && (
            <div style={{ display: 'flex', width: '100%', maxWidth: '380px', marginBottom: '15px', backgroundColor: '#fff', borderRadius: '12px', padding: '5px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <button onClick={() => setActiveTab('query')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: activeTab === 'query' ? '#ffebee' : 'transparent', color: activeTab === 'query' ? '#d81b60' : '#888', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s' }}>
                🔍 13月亮曆查詢
              </button>
              <button onClick={() => setActiveTab('daily')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: activeTab === 'daily' ? '#f3e5f5' : 'transparent', color: activeTab === 'daily' ? '#8e24aa' : '#888', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s' }}>
                🌟 今日宇宙能量
              </button>
            </div>
          )}

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
                      <button onClick={() => handleLoadRecord(record)} style={{ padding: '6px 15px', fontSize: '12px', backgroundColor: '#e3f2fd', color: '#1976d2', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>排盤</button>
                      <button onClick={() => handleDeleteRecord(record.id)} style={{ padding: '6px 15px', fontSize: '12px', backgroundColor: '#ffebee', color: '#d32f2f', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>刪除</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : activeTab === 'query' ? (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', marginBottom: '20px', width: '100%', maxWidth: '380px', boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                  <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="請輸入名字" style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #f8bbd0', outline: 'none', boxSizing: 'border-box', minWidth: '0' }} />
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #f8bbd0', outline: 'none', boxSizing: 'border-box', minWidth: '0' }} />
                </div>
                <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                  <button onClick={downloadScreenshot} style={{ flex: 1, padding: '10px 5px', fontSize: '13px', fontWeight: 'bold', color: '#fff', backgroundColor: '#ec407a', border: 'none', borderRadius: '8px', cursor: 'pointer', boxShadow: '0 4px 10px rgba(236, 64, 122, 0.3)', boxSizing: 'border-box' }}>
                    📸 另存圖卡
                  </button>
                  <button onClick={handleSaveRecord} style={{ flex: 1, padding: '10px 5px', fontSize: '13px', fontWeight: 'bold', color: '#fff', backgroundColor: '#26a69a', border: 'none', borderRadius: '8px', cursor: 'pointer', boxShadow: '0 4px 10px rgba(38, 166, 154, 0.3)', boxSizing: 'border-box' }}>
                    💾 儲存至雲端
                  </button>
                </div>
              </div>

              <div ref={captureRef} style={{ backgroundColor: '#ffffff', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', width: '100%', maxWidth: '380px', padding: '25px 15px 15px 15px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

                <div style={{ textAlign: 'center', marginTop: '5px', marginBottom: '25px' }}>
                  <div style={{ fontSize: '16px', color: '#f06292', letterSpacing: '2px', marginBottom: '8px' }}>✨ 星系矩陣 ✨</div>
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                    {isDefaultName ? '此日期的主印記' : `${userName}的主印記`} {formattedDate}
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
                  <div style={reportRowStyle}><div style={reportLabelStyle}>13月亮曆</div><div style={{ ...reportValueStyle, color: '#3949ab' }}>{moonDateDisplay}</div></div>
                  <div style={reportRowStyle}><div style={reportLabelStyle}>所屬城堡</div><div style={{ ...reportValueStyle, color: castleColor }}>⬤ {castleName}</div></div>
                  <div style={reportRowStyle}><div style={reportLabelStyle}>地球家族</div><div style={reportValueStyle}>{earthFamilyName}</div></div>
                  <div style={reportRowStyle}><div style={reportLabelStyle}>引導</div><div style={{...reportValueStyle, color: getSealColor(guideIndex)}}>{guideSeal.name}</div></div>
                  <div style={reportRowStyle}><div style={reportLabelStyle}>支持</div><div style={{...reportValueStyle, color: getSealColor(supportIndex)}}>{supportSeal.name}</div></div>
                  <div style={reportRowStyle}><div style={reportLabelStyle}>挑戰</div><div style={{...reportValueStyle, color: getSealColor(challengeIndex)}}>{challengeSeal.name}</div></div>
                  <div style={{...reportRowStyle, borderBottom: 'none'}}><div style={reportLabelStyle}>推動</div><div style={{...reportValueStyle, color: getSealColor(hiddenIndex)}}>{fullHiddenName} (Kin {fullHiddenKin})</div></div>
                </div>

                {/* 🚀 ✨ 粉色版全新 2x2 絕美網格排版 ✨ 🚀 */}
                <div style={{...reportCardStyle, backgroundColor: '#fff0f5', borderColor: '#f8bbd0', padding: '20px 15px'}}>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#d81b60', marginBottom: '15px', textAlign: 'center', letterSpacing: '1px' }}>
                    高階星際數據
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', width: '100%' }}>
                    
                    {/* 1. PSI 記憶 */}
                    <MiniOracleCard 
                      title="PSI 記憶" 
                      kinNum={psiKinNum} 
                      kinDetails={getAdvancedKinDetails(psiKinNum)} 
                      oracleDetails={getOracleDetails(psiKinNum)} 
                    />

                    {/* 2. 女神印記 */}
                    <MiniOracleCard 
                      title="女神印記" 
                      kinNum={goddessKinNum} 
                      kinDetails={goddessKinDetails} 
                      oracleDetails={getOracleDetails(goddessKinNum)} 
                    />

                    {/* 3. 對等 KIN */}
                    <MiniOracleCard 
                      title="對等 KIN" 
                      kinNum={eqKinNum} 
                      kinDetails={eqKinDetails} 
                      oracleDetails={getOracleDetails(eqKinNum)} 
                    />

                    {/* 4. HK21 對等 */}
                    <MiniOracleCard 
                      title="HK21 對等" 
                      kinNum={hk21KinNum} 
                      kinDetails={hk21Details} 
                      oracleDetails={getOracleDetails(hk21KinNum)} 
                    />

                  </div>
                </div>

                <div style={{ marginTop: '20px', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <img src="/Bxc Balance LOGO.png" alt="Bxc Balance LOGO" style={{ width: '120px', height: 'auto', opacity: 0.8, transform: 'translateX(-10px)' }} />
                </div>
              </div>
            </>
          ) : (
            <div style={{ width: '100%', maxWidth: '380px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              
              <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', padding: '25px 15px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', boxSizing: 'border-box' }}>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>今日宇宙能量 ({getTodayString()})</div>
                <div style={{ fontSize: '28px', fontWeight: '900', color: '#4a148c', marginBottom: '5px' }}>KIN {todayKinNumber}</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#7b1fa2', marginBottom: '20px' }}>
                  {todayToneName}的{todayMainSeal.name}
                </div>

                <div style={{ position: 'relative', border: '2px solid #f3e5f5', borderRadius: '20px', padding: '20px', backgroundColor: '#fafafa', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(3, auto)', gap: '10px', alignItems: 'center', justifyItems: 'center', width: '100%', boxSizing: 'border-box' }}>
                  <div style={{ gridArea: '1 / 1 / 2 / 2', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><img src={tWavespellSeal.img} alt="波符" style={{ width: '28px' }} /><span style={{...labelStyle, fontSize: '10px'}}>波符：{tWavespellSeal.name}</span></div>
                  <div style={{ gridArea: '1 / 2 / 2 / 3', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><img src={tGuideSeal.img} alt="引導" style={{ width: '42px' }} /><span style={{...labelStyle, fontSize: '10px'}}>引導：{tGuideSeal.name}</span></div>
                  <div style={{ gridArea: '2 / 1 / 3 / 2', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><img src={tChallengeSeal.img} alt="挑戰" style={{ width: '42px' }} /><span style={{...labelStyle, fontSize: '10px'}}>挑戰：{tChallengeSeal.name}</span></div>
                  <div style={{ gridArea: '2 / 2 / 3 / 3', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><img src={`/tone_${todayToneNumber}.png`} alt={`調性 ${todayToneNumber}`} style={{ height: '10px', marginBottom: '4px', objectFit: 'contain' }} /><img src={todayMainSeal.img} alt="主印記" style={{ width: '64px' }} /><img src={`/tone_${todayBottomToneNumber}.png`} alt={`推動調性 ${todayBottomToneNumber}`} style={{ height: '10px', marginTop: '4px', objectFit: 'contain' }} /><span style={{...labelStyle, fontSize: '10px'}}>{todayMainSeal.name}</span></div>
                  <div style={{ gridArea: '2 / 3 / 3 / 4', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><img src={tSupportSeal.img} alt="支持" style={{ width: '42px' }} /><span style={{...labelStyle, fontSize: '10px'}}>支持：{tSupportSeal.name}</span></div>
                  <div style={{ gridArea: '3 / 2 / 4 / 3', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><img src={tHiddenSeal.img} alt="隱藏推動" style={{ width: '42px' }} /><span style={{...labelStyle, fontSize: '10px'}}>隱藏推動：{tHiddenSeal.name}</span></div>
                </div>
              </div>

              <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#d81b60', fontSize: '16px', textAlign: 'center', fontWeight: 'bold', letterSpacing: '1px' }}>✨ 今日流日 (AI測試版) ✨</h3>
                
                <div style={{ display: 'flex', gap: '10px', width: '100%', alignItems: 'center' }}>
                  <select
                    value={selectedRecordId}
                    onChange={(e) => setSelectedRecordId(e.target.value)}
                    style={{ flex: 2, padding: '12px 10px', borderRadius: '8px', border: '1px solid #ce93d8', outline: 'none', backgroundColor: '#fafafa', fontSize: '14px', color: '#333' }}
                  >
                    <option value="current">目前輸入 ({userName || '未命名'})</option>
                    {savedRecords.length > 0 && (
                      <optgroup label="☁️ 雲端親友資料庫">
                        {savedRecords.map(r => (
                          <option key={r.id} value={r.id}>{r.name} (Kin {r.kin})</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                  <button
                    onClick={handleGenerateGuidance}
                    disabled={isAiLoading}
                    style={{ flex: 1, padding: '12px 5px', fontSize: '14px', fontWeight: 'bold', color: '#fff', backgroundColor: '#ab47bc', border: 'none', borderRadius: '8px', cursor: isAiLoading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 10px rgba(171, 71, 188, 0.3)' }}
                  >
                    {isAiLoading ? '解析中...' : '今日分析'}
                  </button>
                </div>

                {aiResponse && (
                  <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f3e5f5', borderRadius: '15px', border: '1px solid #e1bee7', width: '100%', boxSizing: 'border-box' }}>
                    <h4 style={{ color: '#8e24aa', margin: '0 0 8px 0', fontSize: '14px', textAlign: 'center' }}>✨ 專屬宇宙導航</h4>
                    <p style={{ color: '#4a148c', fontSize: '14px', lineHeight: '1.7', margin: 0, textAlign: 'justify', whiteSpace: 'pre-line' }}>
                      {aiResponse}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {previewImage && (
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', boxSizing: 'border-box' }}>
              <p style={{ color: '#fff', fontSize: '18px', fontWeight: 'bold', marginBottom: '20px', letterSpacing: '1px' }}>📱 請長按下方圖片即可儲存</p>
              <img src={previewImage} alt="專屬圖卡預覽" style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: '15px', boxShadow: '0 4px 25px rgba(0,0,0,0.5)' }} />
              <button onClick={() => setPreviewImage(null)} style={{ marginTop: '25px', padding: '12px 35px', fontSize: '16px', borderRadius: '30px', border: 'none', backgroundColor: '#fff', color: '#d81b60', fontWeight: 'bold', cursor: 'pointer' }}>✕ 關閉預覽</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
