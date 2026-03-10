import React, { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import './App.css';

import liff from '@line/liff';
import { auth, db } from './firebase'; 
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, doc, setDoc, getDocs, deleteDoc } from 'firebase/firestore';

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

// 🚀 完整 13 月亮曆 PSI 查表大字典 (364天)
const advancedMatrixData = {
  "1-1": { psi: 1 }, "1-2": { psi: 1 }, "1-3": { psi: 1 }, "1-4": { psi: 20 }, "1-5": { psi: 20 }, "1-6": { psi: 20 }, "1-7": { psi: 2 }, "1-8": { psi: 3 }, "1-9": { psi: 4 }, "1-10": { psi: 5 }, "1-11": { psi: 6 }, "1-12": { psi: 7 }, "1-13": { psi: 8 }, "1-14": { psi: 9 }, "1-15": { psi: 10 }, "1-16": { psi: 11 }, "1-17": { psi: 12 }, "1-18": { psi: 13 }, "1-19": { psi: 14 }, "1-20": { psi: 15 }, "1-21": { psi: 16 }, "1-22": { psi: 17 }, "1-23": { psi: 241 }, "1-24": { psi: 241 }, "1-25": { psi: 241 }, "1-26": { psi: 260 }, "1-27": { psi: 260 }, "1-28": { psi: 260 },
  "2-1": { psi: 22 }, "2-2": { psi: 22 }, "2-3": { psi: 22 }, "2-4": { psi: 39 }, "2-5": { psi: 39 }, "2-6": { psi: 39 }, "2-7": { psi: 38 }, "2-8": { psi: 19 }, "2-9": { psi: 21 }, "2-10": { psi: 23 }, "2-11": { psi: 24 }, "2-12": { psi: 25 }, "2-13": { psi: 26 }, "2-14": { psi: 27 }, "2-15": { psi: 28 }, "2-16": { psi: 29 }, "2-17": { psi: 30 }, "2-18": { psi: 31 }, "2-19": { psi: 32 }, "2-20": { psi: 33 }, "2-21": { psi: 34 }, "2-22": { psi: 35 }, "2-23": { psi: 222 }, "2-24": { psi: 222 }, "2-25": { psi: 222 }, "2-26": { psi: 239 }, "2-27": { psi: 239 }, "2-28": { psi: 239 },
  "3-1": { psi: 43 }, "3-2": { psi: 43 }, "3-3": { psi: 43 }, "3-4": { psi: 58 }, "3-5": { psi: 58 }, "3-6": { psi: 58 }, "3-7": { psi: 36 }, "3-8": { psi: 18 }, "3-9": { psi: 37 }, "3-10": { psi: 40 }, "3-11": { psi: 41 }, "3-12": { psi: 42 }, "3-13": { psi: 44 }, "3-14": { psi: 45 }, "3-15": { psi: 46 }, "3-16": { psi: 47 }, "3-17": { psi: 48 }, "3-18": { psi: 49 }, "3-19": { psi: 52 }, "3-20": { psi: 53 }, "3-21": { psi: 54 }, "3-22": { psi: 55 }, "3-23": { psi: 203 }, "3-24": { psi: 203 }, "3-25": { psi: 203 }, "3-26": { psi: 218 }, "3-27": { psi: 218 }, "3-28": { psi: 218 },
  "4-1": { psi: 64 }, "4-2": { psi: 64 }, "4-3": { psi: 64 }, "4-4": { psi: 96 }, "4-5": { psi: 96 }, "4-6": { psi: 96 }, "4-7": { psi: 56 }, "4-8": { psi: 57 }, "4-9": { psi: 59 }, "4-10": { psi: 60 }, "4-11": { psi: 61 }, "4-12": { psi: 62 }, "4-13": { psi: 63 }, "4-14": { psi: 65 }, "4-15": { psi: 66 }, "4-16": { psi: 67 }, "4-17": { psi: 68 }, "4-18": { psi: 70 }, "4-19": { psi: 71 }, "4-20": { psi: 73 }, "4-21": { psi: 74 }, "4-22": { psi: 75 }, "4-23": { psi: 184 }, "4-24": { psi: 184 }, "4-25": { psi: 184 }, "4-26": { psi: 197 }, "4-27": { psi: 197 }, "4-28": { psi: 197 },
  "5-1": { psi: 85 }, "5-2": { psi: 85 }, "5-3": { psi: 85 }, "5-4": { psi: 77 }, "5-5": { psi: 77 }, "5-6": { psi: 77 }, "5-7": { psi: 97 }, "5-8": { psi: 78 }, "5-9": { psi: 79 }, "5-10": { psi: 80 }, "5-11": { psi: 81 }, "5-12": { psi: 82 }, "5-13": { psi: 83 }, "5-14": { psi: 84 }, "5-15": { psi: 86 }, "5-16": { psi: 87 }, "5-17": { psi: 89 }, "5-18": { psi: 90 }, "5-19": { psi: 91 }, "5-20": { psi: 92 }, "5-21": { psi: 94 }, "5-22": { psi: 95 }, "5-23": { psi: 165 }, "5-24": { psi: 165 }, "5-25": { psi: 165 }, "5-26": { psi: 176 }, "5-27": { psi: 176 }, "5-28": { psi: 176 },
  "6-1": { psi: 69 }, "6-2": { psi: 69 }, "6-3": { psi: 69 }, "6-4": { psi: 72 }, "6-5": { psi: 72 }, "6-6": { psi: 72 }, "6-7": { psi: 98 }, "6-8": { psi: 99 }, "6-9": { psi: 100 }, "6-10": { psi: 101 }, "6-11": { psi: 102 }, "6-12": { psi: 103 }, "6-13": { psi: 104 }, "6-14": { psi: 105 }, "6-15": { psi: 121 }, "6-16": { psi: 122 }, "6-17": { psi: 116 }, "6-18": { psi: 117 }, "6-19": { psi: 118 }, "6-20": { psi: 119 }, "6-21": { psi: 120 }, "6-22": { psi: 123 }, "6-23": { psi: 189 }, "6-24": { psi: 189 }, "6-25": { psi: 189 }, "6-26": { psi: 192 }, "6-27": { psi: 192 }, "6-28": { psi: 192 },
  "7-1": { psi: 130 }, "7-2": { psi: 130 }, "7-3": { psi: 130 }, "7-4": { psi: 131 }, "7-5": { psi: 131 }, "7-6": { psi: 131 }, "7-7": { psi: 124 }, "7-8": { psi: 125 }, "7-9": { psi: 126 }, "7-10": { psi: 128 }, "7-11": { psi: 129 }, "7-12": { psi: 132 }, "7-13": { psi: 133 }, "7-14": { psi: 135 }, "7-15": { psi: 136 }, "7-16": { psi: 137 }, "7-17": { psi: 138 }, "7-18": { psi: 139 }, "7-19": { psi: 140 }, "7-20": { psi: 141 }, "7-21": { psi: 142 }, "7-22": { psi: 143 }, "7-23": { psi: 127 }, "7-24": { psi: 127 }, "7-25": { psi: 127 }, "7-26": { psi: 134 }, "7-27": { psi: 134 }, "7-28": { psi: 134 },
  "8-1": { psi: 88 }, "8-2": { psi: 88 }, "8-3": { psi: 88 }, "8-4": { psi: 93 }, "8-5": { psi: 93 }, "8-6": { psi: 93 }, "8-7": { psi: 139 }, "8-8": { psi: 140 }, "8-9": { psi: 141 }, "8-10": { psi: 142 }, "8-11": { psi: 143 }, "8-12": { psi: 144 }, "8-13": { psi: 145 }, "8-14": { psi: 156 }, "8-15": { psi: 157 }, "8-16": { psi: 158 }, "8-17": { psi: 159 }, "8-18": { psi: 160 }, "8-19": { psi: 161 }, "8-20": { psi: 162 }, "8-21": { psi: 163 }, "8-22": { psi: 164 }, "8-23": { psi: 168 }, "8-24": { psi: 168 }, "8-25": { psi: 168 }, "8-26": { psi: 173 }, "8-27": { psi: 173 }, "8-28": { psi: 173 },
  "9-1": { psi: 106 }, "9-2": { psi: 106 }, "9-3": { psi: 106 }, "9-4": { psi: 115 }, "9-5": { psi: 115 }, "9-6": { psi: 115 }, "9-7": { psi: 166 }, "9-8": { psi: 167 }, "9-9": { psi: 169 }, "9-10": { psi: 170 }, "9-11": { psi: 171 }, "9-12": { psi: 172 }, "9-13": { psi: 174 }, "9-14": { psi: 175 }, "9-15": { psi: 177 }, "9-16": { psi: 178 }, "9-17": { psi: 179 }, "9-18": { psi: 180 }, "9-19": { psi: 181 }, "9-20": { psi: 182 }, "9-21": { psi: 183 }, "9-22": { psi: 185 }, "9-23": { psi: 146 }, "9-24": { psi: 146 }, "9-25": { psi: 146 }, "9-26": { psi: 155 }, "9-27": { psi: 155 }, "9-28": { psi: 155 },
  "10-1": { psi: 107 }, "10-2": { psi: 107 }, "10-3": { psi: 107 }, "10-4": { psi: 114 }, "10-5": { psi: 114 }, "10-6": { psi: 114 }, "10-7": { psi: 186 }, "10-8": { psi: 187 }, "10-9": { psi: 188 }, "10-10": { psi: 190 }, "10-11": { psi: 191 }, "10-12": { psi: 193 }, "10-13": { psi: 194 }, "10-14": { psi: 195 }, "10-15": { psi: 196 }, "10-16": { psi: 198 }, "10-17": { psi: 199 }, "10-18": { psi: 200 }, "10-19": { psi: 201 }, "10-20": { psi: 202 }, "10-21": { psi: 204 }, "10-22": { psi: 205 }, "10-23": { psi: 147 }, "10-24": { psi: 147 }, "10-25": { psi: 147 }, "10-26": { psi: 154 }, "10-27": { psi: 154 }, "10-28": { psi: 154 },
  "11-1": { psi: 108 }, "11-2": { psi: 108 }, "11-3": { psi: 108 }, "11-4": { psi: 113 }, "11-5": { psi: 113 }, "11-6": { psi: 113 }, "11-7": { psi: 206 }, "11-8": { psi: 207 }, "11-9": { psi: 208 }, "11-10": { psi: 209 }, "11-11": { psi: 212 }, "11-12": { psi: 213 }, "11-13": { psi: 214 }, "11-14": { psi: 215 }, "11-15": { psi: 216 }, "11-16": { psi: 217 }, "11-17": { psi: 219 }, "11-18": { psi: 220 }, "11-19": { psi: 221 }, "11-20": { psi: 223 }, "11-21": { psi: 224 }, "11-22": { psi: 225 }, "11-23": { psi: 148 }, "11-24": { psi: 148 }, "11-25": { psi: 148 }, "11-26": { psi: 153 }, "11-27": { psi: 153 }, "11-28": { psi: 153 },
  "12-1": { psi: 109 }, "12-2": { psi: 109 }, "12-3": { psi: 109 }, "12-4": { psi: 112 }, "12-5": { psi: 112 }, "12-6": { psi: 112 }, "12-7": { psi: 226 }, "12-8": { psi: 227 }, "12-9": { psi: 228 }, "12-10": { psi: 229 }, "12-11": { psi: 230 }, "12-12": { psi: 231 }, "12-13": { psi: 232 }, "12-14": { psi: 233 }, "12-15": { psi: 234 }, "12-16": { psi: 235 }, "12-17": { psi: 236 }, "12-18": { psi: 237 }, "12-19": { psi: 238 }, "12-20": { psi: 240 }, "12-21": { psi: 242 }, "12-22": { psi: 243 }, "12-23": { psi: 149 }, "12-24": { psi: 149 }, "12-25": { psi: 149 }, "12-26": { psi: 152 }, "12-27": { psi: 152 }, "12-28": { psi: 152 },
  "13-1": { psi: 110 }, "13-2": { psi: 110 }, "13-3": { psi: 110 }, "13-4": { psi: 111 }, "13-5": { psi: 111 }, "13-6": { psi: 111 }, "13-7": { psi: 244 }, "13-8": { psi: 245 }, "13-9": { psi: 246 }, "13-10": { psi: 247 }, "13-11": { psi: 248 }, "13-12": { psi: 249 }, "13-13": { psi: 250 }, "13-14": { psi: 251 }, "13-15": { psi: 252 }, "13-16": { psi: 253 }, "13-17": { psi: 254 }, "13-18": { psi: 255 }, "13-19": { psi: 256 }, "13-20": { psi: 257 }, "13-21": { psi: 258 }, "13-22": { psi: 259 }, "13-23": { psi: 150 }, "13-24": { psi: 150 }, "13-25": { psi: 150 }, "13-26": { psi: 151 }, "13-27": { psi: 151 }, "13-28": { psi: 151 }
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
      }
    };
    initLiff();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
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

  const handleLogout = async () => {
    await signOut(auth);
    if (liff.isLoggedIn()) {
      liff.logout();
      window.location.reload(); 
    }
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

    if (diffDays === 364) return { display: "無時間日 (Day Out of Time)", key: "0-0" };
    
    const moon = Math.floor(diffDays / 28) + 1;
    const day = (diffDays % 28) + 1;
    const moonNames = ["磁性", "月亮", "電力", "自我存在", "超頻", "韻律", "共鳴", "銀河星系", "太陽", "行星", "光譜", "水晶", "宇宙"];
    
    return {
      display: `${moonNames[moon - 1]}之月 第 ${day} 天`,
      key: `${moon}-${day}`
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

  // 🚀 協助計算五神諭 Kin 數值的函數
  const getKinFromIndexAndTone = (sealIdx, tone) => {
    for (let k = 1; k <= 260; k++) {
      if (k % 20 === sealIdx && ((k - 1) % 13) + 1 === tone) return k;
    }
    return 260;
  };

  const getSealColor = (index) => {
    const colors = ["#d32f2f", "#757575", "#1976d2", "#fbc02d"]; 
    return colors[index % 4];
  };

  const getAdvancedKinDetails = (calculatedKin) => {
    if (!calculatedKin) return { name: "", color: "#333" };
    const tone = ((calculatedKin - 1) % 13) + 1;
    const sealIndex = calculatedKin % 20;
    const seal = seals[sealIndex];
    const name = `${toneNames[tone - 1]}的${seal.name}`;
    const color = getSealColor(sealIndex);
    return { kin: calculatedKin, name, color };
  };

  // 🚀 女神印記算法：主印記 + 引導 + 支持 + 挑戰 + 推動
  const guideKinNum = getKinFromIndexAndTone(guideIndex, toneNumber);
  const supportKinNum = getKinFromIndexAndTone(supportIndex, toneNumber);
  const challengeKinNum = getKinFromIndexAndTone(challengeIndex, toneNumber);
  const hiddenKinNum = getKinFromIndexAndTone(hiddenIndex, bottomToneNumber);
  const goddessKinNum = (kinNumber + guideKinNum + supportKinNum + challengeKinNum + hiddenKinNum) % 260 || 260;
  const goddessKinDetails = getAdvancedKinDetails(goddessKinNum);

  const moonInfo = get13MoonDateInfo(date);
  const moonDateDisplay = moonInfo.display;
  const advData = advancedMatrixData[moonInfo.key];

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
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile", messages: [{ role: "user", content: prompt }],
          temperature: 0.7, max_tokens: 250
        })
      });

      if (!response.ok) throw new Error((await response.json()).error?.message || 'Groq API 請求失敗');
      setAiResponse((await response.json()).choices[0].message.content);
    } catch (error) {
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
              <button onClick={handleLogout} style={{ padding: '6px 10px', fontSize: '12px', backgroundColor: 'transparent', border: '1px solid #aaa', color: '#aaa', borderRadius: '8px', cursor: 'pointer' }}>登出</button>
            </div>
          </div>

          {!showRecordsView && (
            <div style={{ display: 'flex', width: '100%', maxWidth: '380px', marginBottom: '15px', backgroundColor: '#fff', borderRadius: '12px', padding: '5px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <button onClick={() => setActiveTab('query')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: activeTab === 'query' ? '#ffebee' : 'transparent', color: activeTab === 'query' ? '#d81b60' : '#888', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s' }}>
                🔍 13月亮曆查詢
              </button>
              <button onClick={() => setActiveTab('daily')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: activeTab === 'daily' ? '#f3e5f5' : 'transparent', color: activeTab === 'daily' ? '#8e24aa' : '#888', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s' }}>
                🌟 今日流日(AI測試版)
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
                  <div style={reportRowStyle}><div style={reportLabelStyle}>引導</div><div style={{...reportValueStyle, color: '#1976d2'}}>{guideSeal.name}</div></div>
                  <div style={reportRowStyle}><div style={reportLabelStyle}>支持</div><div style={{...reportValueStyle, color: '#fbc02d'}}>{supportSeal.name}</div></div>
                  <div style={reportRowStyle}><div style={reportLabelStyle}>挑戰</div><div style={{...reportValueStyle, color: '#d32f2f'}}>{challengeSeal.name}</div></div>
                  <div style={{...reportRowStyle, borderBottom: 'none'}}><div style={reportLabelStyle}>推動</div><div style={{...reportValueStyle, color: '#757575'}}>{fullHiddenName} (Kin {fullHiddenKin})</div></div>
                </div>

                {/* 🚀 安全版：高階星際數據卡片 (解鎖女神印記) */}
                <div style={{...reportCardStyle, backgroundColor: '#fff8e1', borderColor: '#ffe082'}}>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#e65100', marginBottom: '15px' }}>高階星際數據 (Synchronotron 441)</div>
                  
                  <div style={reportRowStyle}>
                    <div style={reportLabelStyle}>PSI 記憶</div>
                    {advData && advData.psi ? (
                      <div style={{ ...reportValueStyle, color: getAdvancedKinDetails(advData.psi).color }}>Kin {advData.psi} {getAdvancedKinDetails(advData.psi).name}</div>
                    ) : (
                      <div style={{ ...reportValueStyle, color: '#aaa', fontWeight: 'normal', fontSize: '12px' }}>🔒 待字典建檔解鎖</div>
                    )}
                  </div>

                  <div style={reportRowStyle}>
                    <div style={reportLabelStyle}>女神印記</div>
                    {/* 🚀 這裡已經全面解鎖！不再依賴字典，直接算出！ */}
                    <div style={{ ...reportValueStyle, color: goddessKinDetails.color }}>
                      Kin {goddessKinNum} {goddessKinDetails.name}
                    </div>
                  </div>

                  <div style={reportRowStyle}>
                    <div style={reportLabelStyle}>對等 Kin</div>
                    <div style={{ ...reportValueStyle, color: '#aaa', fontWeight: 'normal', fontSize: '12px' }}>🔒 待 441 矩陣解鎖</div>
                  </div>

                  <div style={{...reportRowStyle, borderBottom: 'none'}}>
                    <div style={reportLabelStyle}>HK21 對等</div>
                    <div style={{ ...reportValueStyle, color: '#aaa', fontWeight: 'normal', fontSize: '12px' }}>🔒 待 441 矩陣解鎖</div>
                  </div>
                </div>

                <div style={{ marginTop: '20px', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <img src="/Bxc Balance LOGO.png" alt="Bxc Balance LOGO" style={{ width: '120px', height: 'auto', opacity: 0.8, transform: 'translateX(-10px)' }} />
                </div>
              </div>
            </>
          ) : (
            <div style={{ width: '100%', maxWidth: '380px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              
              <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', padding: '30px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>今日宇宙能量 ({getTodayString()})</div>
                <div style={{ fontSize: '32px', fontWeight: '900', color: '#4a148c', marginBottom: '10px' }}>KIN {todayKinNumber}</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#7b1fa2', marginBottom: '20px' }}>
                  {todayToneName}的{todayMainSeal.name}
                </div>
                <img src={todayMainSeal.img} alt={todayMainSeal.name} style={{ width: '90px', marginBottom: '15px' }} />
                <img src={`/tone_${todayToneNumber}.png`} alt={`調性 ${todayToneNumber}`} style={{ height: '18px', objectFit: 'contain' }} />
              </div>

              <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#555', fontSize: '15px' }}>✨ 獲取專屬流日指引</h4>
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
                    <p style={{ color: '#4a148c', fontSize: '14px', lineHeight: '1.7', margin: 0, textAlign: 'justify' }}>
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
