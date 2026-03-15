// src/App.jsx
import React, { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import './App.css';

import liff from '@line/liff';
import { auth, db } from './firebase'; 
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { collection, doc, setDoc, getDocs, deleteDoc, getDoc, updateDoc, getDocFromServer, query, orderBy } from 'firebase/firestore';

import { 
  seals, toneNames, earthFamilies, castles, castleColors, advancedMatrixData, plasmasBMU, archetypeBMUs,
  getGuideIndex, getSealColor, getAdvancedKinDetails, getOracleDetails, 
  get13MoonDateInfo, calculateKin, getKinFromIndexAndTone 
} from './mayaEngine';
import { timeMatrix, spaceMatrix, synchronicMatrix } from './Matrix441';

import BoardGameRecord from './BoardGameRecord';
import GameLobbyManager from './GameLobbyManager';

const getSafeName = (userObj) => {
  if (!userObj) return "旅人";
  if (userObj.displayName) return userObj.displayName;
  if (userObj.email && !userObj.email.includes('line.bxc.com')) {
    const parts = userObj.email.split('@');
    return parts.length > 0 ? parts[0] : "旅人";
  }
  return "旅人";
};

const formatDateString = (ts) => {
  if (!ts) return '未知';
  const d = new Date(ts);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
};

const formatJoinDate = (u) => {
  if (u.createdAt) return formatDateString(u.createdAt);
  if (u.updatedAt) return `${formatDateString(u.updatedAt)} (最後活動)`;
  return '🌟 早期創始會員';
};

const getKinTextInfo = (kin) => {
  if (!kin) return { toneName: '', sealName: '' };
  const t = ((kin - 1) % 13) + 1;
  const m = kin % 20;
  return { toneName: toneNames[t - 1], sealName: seals[m]?.name || '' };
};

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
      <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(3, auto)', gap: '6px', alignItems: 'center', justifyItems: 'center', width: '100%' }}>
        <div style={{ gridArea: '1 / 1 / 2 / 2', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><img src={oracleDetails.wavespellSeal.img} alt="波符" style={{ width: '18px', opacity: 0.8 }} /></div>
        <div style={{ gridArea: '1 / 2 / 2 / 3', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><img src={oracleDetails.guideSeal.img} alt="引導" style={{ width: '28px' }} /></div>
        <div style={{ gridArea: '2 / 1 / 3 / 2', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><img src={oracleDetails.challengeSeal.img} alt="挑戰" style={{ width: '28px' }} /></div>
        <div style={{ gridArea: '2 / 2 / 3 / 3', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><img src={`/tone_${oracleDetails.tone}.png`} alt="調性" style={{ height: '8px', marginBottom: '4px', objectFit: 'contain' }} /><img src={oracleDetails.mainSeal.img} alt="主印記" style={{ width: '42px' }} /><img src={`/tone_${oracleDetails.bottomTone}.png`} alt="推動調性" style={{ height: '8px', marginTop: '4px', objectFit: 'contain' }} /></div>
        <div style={{ gridArea: '2 / 3 / 3 / 4', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><img src={oracleDetails.supportSeal.img} alt="支持" style={{ width: '28px' }} /></div>
        <div style={{ gridArea: '3 / 2 / 4 / 3', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><img src={oracleDetails.hiddenSeal.img} alt="隱藏推動" style={{ width: '28px' }} /></div>
      </div>
    </div>
  );
};

const labelStyle = { fontSize: '11px', color: '#888', marginTop: '4px', fontWeight: 'normal', whiteSpace: 'nowrap' };
const reportCardStyle = { backgroundColor: '#f8fafd', borderRadius: '16px', padding: '20px', marginTop: '20px', width: '100%', boxSizing: 'border-box', border: '1px solid #e8eaf6' };
const reportRowStyle = { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px dashed #e0e0e0', fontSize: '13px', alignItems: 'center' };
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
  const [isLoginProcessing, setIsLoginProcessing] = useState(false); 
  const [lineProfile, setLineProfile] = useState(null);
  
  const [date, setDate] = useState(getTodayString());
  const [userName, setUserName] = useState(''); 
  const captureRef = useRef(null); 
  const [previewImage, setPreviewImage] = useState(null);
  const [aiResponse, setAiResponse] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [dailyFlowInfo, setDailyFlowInfo] = useState(null);

  const [myProfile, setMyProfile] = useState(null);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [profileInputName, setProfileInputName] = useState('');
  const [profileInputDate, setProfileInputDate] = useState(getTodayString());

  const [savedRecords, setSavedRecords] = useState([]);
  const [recordsLoaded, setRecordsLoaded] = useState(false); 
  const [showRecordsView, setShowRecordsView] = useState(false);

  const [showAdminButton, setShowAdminButton] = useState(localStorage.getItem('bxc_show_admin_btn') === 'true');
  const [isAdmin, setIsAdmin] = useState(localStorage.getItem('bxc_admin') === 'true');
  const [showAdminView, setShowAdminView] = useState(false);
  const [allUsersList, setAllUsersList] = useState([]);
  const [viewingUser, setViewingUser] = useState(null);
  const [viewingUserRecords, setViewingUserRecords] = useState([]);
  const [adminViewingRecord, setAdminViewingRecord] = useState(null);

  const [activeTab, setActiveTab] = useState('query'); 
  const [viewingTarget, setViewingTarget] = useState(null);
  const [selectedRecordId, setSelectedRecordId] = useState('my'); 
  
  const [showBasicConfig, setShowBasicConfig] = useState(true);
  const [showAdvancedData, setShowAdvancedData] = useState(true);

  const [activeGameRoom, setActiveGameRoom] = useState(null);
  const [isGameUnlocked, setIsGameUnlocked] = useState(localStorage.getItem('bxc_game_unlocked') === 'true');
  const [inviteCode, setInviteCode] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('panel') === 'admin') {
        setShowAdminButton(true);
        localStorage.setItem('bxc_show_admin_btn', 'true');
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const updateAdminState = (status) => {
    setIsAdmin(status);
    if (status) localStorage.setItem('bxc_admin', 'true');
    else localStorage.removeItem('bxc_admin');
  };

  const performFirebaseLogin = async (profile) => {
    const lineEmail = `${profile.userId}@line.bxc.com`;
    const linePassword = `Liff_${profile.userId}_Secret`; 
    
    // 🌟 防護機制：如果 Firebase 已經用同一個帳號登入過，就不要再重跑登入流程，避免狀態被重洗
    if (auth.currentUser && auth.currentUser.email === lineEmail) {
      try {
        await setDoc(doc(db, "users", auth.currentUser.uid), { displayName: profile.displayName, updatedAt: Date.now() }, { merge: true });
      } catch(e) {}
      return;
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, lineEmail, linePassword);
      await setDoc(doc(db, "users", cred.user.uid), { email: lineEmail, displayName: profile.displayName, updatedAt: Date.now() }, { merge: true });
    } catch (error) {
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-login-credentials') {
        try {
           const cred = await createUserWithEmailAndPassword(auth, lineEmail, linePassword);
           await setDoc(doc(db, "users", cred.user.uid), { email: lineEmail, displayName: profile.displayName, isAdmin: false, createdAt: Date.now() });
        } catch (e) {}
      }
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fallbackTimer = setTimeout(() => { if (isMounted) setIsInitializing(false); }, 3000);

    const initLiff = async () => {
      try {
        await liff.init({ liffId: import.meta.env.VITE_LIFF_ID });
        if (liff.isLoggedIn()) {
          const profile = await liff.getProfile();
          setLineProfile(profile);
          if (profile.displayName) localStorage.setItem('line_displayName', profile.displayName);
          await performFirebaseLogin(profile);
        }
      } catch (err) {} finally {
        if (isMounted) setIsInitializing(false);
        clearTimeout(fallbackTimer);
      }
    };
    initLiff();
    return () => { isMounted = false; clearTimeout(fallbackTimer); };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const localLineName = localStorage.getItem('line_displayName');
        const defaultName = localLineName || currentUser.displayName || "旅人";

        // 🌟 防護機制：0 秒瞬間讀取本地快取，防止「進入太快」造成的重複輸入彈窗
        const cachedProfileStr = localStorage.getItem(`bxc_my_profile_${currentUser.uid}`);
        if (cachedProfileStr) {
          try {
            const parsedProfile = JSON.parse(cachedProfileStr);
            setMyProfile(parsedProfile);
            if (!userName || userName === '旅人') {
              setUserName(parsedProfile.name);
              setDate(parsedProfile.date);
            }
          } catch(e) {}
        }

        try {
          const userRef = doc(db, "users", currentUser.uid);
          const userSnap = await getDoc(userRef);

          if (!userSnap.exists()) {
             await setDoc(userRef, { email: currentUser.email || "", displayName: defaultName, isAdmin: false, createdAt: Date.now() }, { merge: true });
             if (!cachedProfileStr) {
               setProfileInputName(defaultName);
               setShowProfileSetup(true);
             }
          } else {
             const dbData = userSnap.data();
             const adminStatus = dbData.isAdmin === true || String(dbData.isAdmin).toLowerCase() === 'true';
             updateAdminState(adminStatus);
             
             if (dbData.myProfile) {
                 setMyProfile(dbData.myProfile);
                 localStorage.setItem(`bxc_my_profile_${currentUser.uid}`, JSON.stringify(dbData.myProfile)); // 同步覆寫快取
                 if (!userName || userName === '旅人') {
                     setUserName(dbData.myProfile.name);
                     setDate(dbData.myProfile.date);
                 }
             } else if (!cachedProfileStr) {
                 setProfileInputName(defaultName);
                 setShowProfileSetup(true);
             }
          }

          const recordsRef = collection(db, "users", currentUser.uid, "records");
          const q = query(recordsRef, orderBy("timestamp", "desc"));
          const snapshot = await getDocs(q);
          const cloudRecords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

          setSavedRecords(cloudRecords);
          setRecordsLoaded(true); 
        } catch (error) { setRecordsLoaded(true); }
        
        setIsInitializing(false); // 確保所有資料都撈完或快取生效後，才關閉讀取畫面
      } else {
        setSavedRecords([]); setRecordsLoaded(false); updateAdminState(false); setMyProfile(null);
        setIsInitializing(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user && !adminViewingRecord) {
      if (userName.trim() !== '' && userName !== "旅人") {
        localStorage.setItem(`maya_name_${user.uid}`, userName);
      }
      if (date && date.length > 5) localStorage.setItem(`maya_date_${user.uid}`, date);
    }
  }, [userName, date, user, adminViewingRecord]);

  const autoSaveTriggered = useRef(false);
  useEffect(() => {
    if (user && recordsLoaded && savedRecords.length === 0 && !autoSaveTriggered.current) {
      if (userName && userName !== "旅人" && date !== getTodayString()) {
        autoSaveTriggered.current = true;
        handleSaveRecord(true); 
      }
    }
  }, [date, userName, user, recordsLoaded, savedRecords.length]);

  const handleAdminClick = async () => {
    if (showAdminView) { setShowAdminView(false); return; }
    if (!user) return alert("🔄 系統載入中，請稍候一秒再按！");
    try {
        let realIsAdmin = isAdmin; 
        if (!realIsAdmin) {
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDocFromServer(userRef);
            const dbData = userSnap.data();
            realIsAdmin = dbData && (dbData.isAdmin === true || String(dbData.isAdmin).toLowerCase() === 'true');
            if (realIsAdmin) updateAdminState(true);
        }
        if (realIsAdmin) {
            fetchAllUsers();
            setShowAdminView(true); setShowRecordsView(false); setAdminViewingRecord(null); setViewingTarget(null);
        } else {
            alert("⚠️ 權限不足！");
        }
    } catch (error) { alert("⚠️ 權限驗證失敗，請檢查網路連線狀態！"); }
  };

  const fetchAllUsers = async () => {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const users = [];
      querySnapshot.forEach((d) => { users.push({ id: d.id, ...d.data() }); });
      setAllUsersList(users);
    } catch(e) { }
  };

  const loadUserRecords = async (targetUser) => {
    try {
      const recordsRef = collection(db, "users", targetUser.id, "records");
      const q = query(recordsRef, orderBy("timestamp", "desc"));
      const snapshot = await getDocs(q);
      const r = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setViewingUserRecords(r); setViewingUser(targetUser);
    } catch (e) { }
  };

  const removeAdmin = async (targetUser) => {
    if(!window.confirm(`確定要移除 ${getSafeName(targetUser)} 的管理員權限嗎？`)) return;
    try { await updateDoc(doc(db, "users", targetUser.id), { isAdmin: false }); fetchAllUsers(); } 
    catch (e) { }
  };

  const handleLineLogin = async () => {
    if (isLoginProcessing) return;
    setIsLoginProcessing(true);
    try {
      if (!liff.isLoggedIn()) {
        liff.login();
      } else {
        const profile = await liff.getProfile();
        setLineProfile(profile);
        if (profile.displayName) localStorage.setItem('line_displayName', profile.displayName);
        await performFirebaseLogin(profile);
      }
    } catch (err) {
      alert("登入過程發生異常，請重整網頁試試！");
    } finally {
      setIsLoginProcessing(false);
    }
  };

  const handleSaveMyProfile = async () => {
    if (!profileInputName.trim() || !profileInputDate) return alert("請填寫完整的姓名與生日！");
    const kNum = calculateKin(profileInputDate);
    const newProfile = { name: profileInputName.trim(), date: profileInputDate, kin: kNum };
    
    try {
      await setDoc(doc(db, "users", user.uid), { myProfile: newProfile }, { merge: true });
      setMyProfile(newProfile);
      localStorage.setItem(`bxc_my_profile_${user.uid}`, JSON.stringify(newProfile)); // 🌟 寫入本地快取
      setUserName(newProfile.name);
      setDate(newProfile.date);
      setShowProfileSetup(false);
      alert("✅ 「我的主印記」設定完成！");
    } catch (error) {
      alert("儲存失敗，請檢查網路連線！");
    }
  };

  const handleSaveRecord = async (isSilent = false) => {
    const silent = isSilent === true;
    if (!userName.trim() && !silent) return alert("請先在上方輸入「姓名」才能儲存喔！");
    if (!userName.trim() && silent) return; 
    if (!user) { if(!silent) alert("請先登入才能使用雲端儲存功能！"); return; }

    const existingIndex = savedRecords.findIndex(r => r.name === userName.trim());
    const docId = existingIndex >= 0 ? savedRecords[existingIndex].id : Date.now().toString();
    const newRecordData = { name: userName.trim(), date: date, kin: kinNumber, sealName: mainSeal.name, toneName: currentToneName, timestamp: Date.now() };

    try {
      await setDoc(doc(db, "users", user.uid, "records", docId), newRecordData);
      let newRecords = [...savedRecords];
      const stateRecord = { id: docId, ...newRecordData };
      if (existingIndex >= 0) newRecords[existingIndex] = stateRecord; else newRecords.unshift(stateRecord);
      newRecords.sort((a, b) => b.timestamp - a.timestamp);
      setSavedRecords(newRecords);
      if (!silent) alert(`✅ 已成功將 ${userName.trim()} 的親友資料同步至雲端資料庫！`);
    } catch (error) { if (!silent) alert("雲端儲存失敗，請檢查資料庫權限設定！"); }
  };

  const handleDeleteRecord = async (idToRemove) => {
    try { await deleteDoc(doc(db, "users", user.uid, "records", idToRemove)); setSavedRecords(savedRecords.filter(r => r.id !== idToRemove)); } catch (error) {}
  };

  const todayDateString = getTodayString();
  let calcDate = date;
  let calcName = userName;

  if (activeTab === 'query' && !showRecordsView && !showAdminView && !adminViewingRecord) {
    if (viewingTarget === 'my' && myProfile) {
      calcDate = myProfile.date;
      calcName = myProfile.name;
    } else if (viewingTarget === 'today') {
      calcDate = todayDateString;
      calcName = '今日宇宙能量';
    }
  } else if (adminViewingRecord) {
    calcDate = adminViewingRecord.date;
    calcName = adminViewingRecord.name;
  }

  const kinNumber = calculateKin(calcDate);
  const toneNumber = ((kinNumber - 1) % 13) + 1;
  const bottomToneNumber = 14 - toneNumber;
  const currentToneName = toneNames[toneNumber - 1]; 
  const mainIndex = kinNumber % 20;

  const challengeIndex = (mainIndex + 10) % 20;
  const supportIndex = (39 - mainIndex) % 20;
  const hiddenIndex = (21 - mainIndex) % 20;
  const guideIndex = getGuideIndex(mainIndex, toneNumber);
  const wavespellIndex = (mainIndex - (toneNumber - 1) + 260) % 20;

  const mainSeal = seals[mainIndex] || seals[0];
  const challengeSeal = seals[challengeIndex] || seals[0];
  const supportSeal = seals[supportIndex] || seals[0];
  const hiddenSeal = seals[hiddenIndex] || seals[0];
  const guideSeal = seals[guideIndex] || seals[0];
  const wavespellSeal = seals[wavespellIndex] || seals[0];

  const moonInfo = get13MoonDateInfo(calcDate);
  const moonDateDisplay = moonInfo.display;
  const psiKinNum = advancedMatrixData[moonInfo.key];

  const guideKinNum = getKinFromIndexAndTone(guideIndex, toneNumber);
  const supportKinNum = getKinFromIndexAndTone(supportIndex, toneNumber);
  const challengeKinNum = getKinFromIndexAndTone(challengeIndex, toneNumber);
  const hiddenKinNum = getKinFromIndexAndTone(hiddenIndex, bottomToneNumber);
  const goddessKinNum = (kinNumber + guideKinNum + supportKinNum + challengeKinNum + hiddenKinNum) % 260 || 260;
  const goddessKinDetails = getAdvancedKinDetails(goddessKinNum);

  let eqKinNum = null; let eqKinDetails = { name: "🔒 待解鎖", color: "#aaa" };
  let hk21KinNum = null; let hk21Details = { name: "🔒 待解鎖", color: "#aaa" };

  if (moonInfo.moon > 0 && timeMatrix && spaceMatrix && synchronicMatrix) {
    const getTelektononCoordinate = (m, d) => {
      let r, c, topR, botR;
      if (m <= 7) { topR = m - 1; botR = m + 13; } else { topR = 13 - m; botR = 27 - m; } 
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
      for (let r = 0; r < 21; r++) { if (r === 10) continue; for (let c = 4; c <= 16; c++) if (synchronicMatrix[r][c] === k) return { r, c }; }
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

    const plasmaIndex = (moonInfo.day - 1) % 7;
    const plasmaBMU = plasmasBMU[plasmaIndex];
    const hk21Sum = archetypeBMUs[mainIndex] + archetypeBMUs[guideIndex] + archetypeBMUs[supportIndex] + archetypeBMUs[challengeIndex] + archetypeBMUs[hiddenIndex] + plasmaBMU;
    hk21KinNum = hk21Sum % 260 || 260;
    hk21Details = getAdvancedKinDetails(hk21KinNum);
  }

  const earthFamilyIndex = mainIndex % 5 || 0;
  const earthFamilyName = earthFamilies[earthFamilyIndex];
  const castleIndex = isNaN(kinNumber) ? 0 : Math.floor((kinNumber - 1) / 52);
  const castleName = castles[castleIndex];
  const castleColor = castleColors[castleIndex];

  const fullHiddenKin = isNaN(kinNumber) ? 260 : 261 - kinNumber;
  const fullHiddenTone = ((fullHiddenKin - 1) % 13) + 1;
  const fullHiddenSeal = seals[fullHiddenKin % 20] || seals[0];
  const fullHiddenName = `${toneNames[fullHiddenTone - 1]}的${fullHiddenSeal.name}`;

  const isDefaultName = !calcName || calcName.trim() === '' || calcName === '旅人';
  const dateParts = calcDate ? calcDate.split('-') : getTodayString().split('-');
  const formattedDate = dateParts.length === 3 ? `${dateParts[0]}/${parseInt(dateParts[1], 10)}/${parseInt(dateParts[2], 10)}` : '';

  const todayKinNumber = calculateKin(todayDateString);
  const todayToneNumber = ((todayKinNumber - 1) % 13) + 1;
  const todayMainIndex = todayKinNumber % 20;
  const todayMainSeal = seals[todayMainIndex] || seals[0];
  const todayToneName = toneNames[todayToneNumber - 1];

  const handleGenerateGuidance = async () => {
    setIsAiLoading(true); 
    setAiResponse('');
    setDailyFlowInfo(null); 

    try {
      let targetName, targetKin, targetToneName, targetSealName;
      if (selectedRecordId === 'my' && myProfile) {
        targetName = myProfile.name; targetKin = myProfile.kin; 
        const info = getKinTextInfo(myProfile.kin);
        targetToneName = info.toneName; targetSealName = info.sealName;
      } else {
        const record = savedRecords.find(r => r.id === selectedRecordId);
        if (!record) throw new Error("找不到該筆資料");
        targetName = record.name; targetKin = record.kin; targetToneName = record.toneName; targetSealName = record.sealName;
      }

      let pDailyKin = (targetKin + todayKinNumber) % 260; if (pDailyKin === 0) pDailyKin = 260;
      const pDailyToneNumber = ((pDailyKin - 1) % 13) + 1; const pDailyMainSeal = seals[pDailyKin % 20]; const pDailyToneName = toneNames[pDailyToneNumber - 1];
      
      setDailyFlowInfo({
        kin: pDailyKin,
        toneName: pDailyToneName,
        seal: pDailyMainSeal
      });

      const prompt = `你是一位專業且溫暖的瑪雅13月亮曆解讀師。使用者 ${targetName} 的主印記是：「KIN ${targetKin} ${targetToneName}的${targetSealName}」。今天的宇宙流日印記是：「KIN ${todayKinNumber} ${todayToneName}的${todayMainSeal.name}」。這兩者結合而成的【個人專屬今日流日印記】為：「KIN ${pDailyKin} ${pDailyToneName}的${pDailyMainSeal.name}」。請直接以這個專屬流日印記的能量氛圍為核心，用 100 字以內，給 ${targetName} 一段今天專屬的行動建議與祝福。`;
      const apiKey = import.meta.env.VITE_GROQ_API_KEY;
      let data = null; let lastError = null;
      for (let i = 0; i < 2; i++) {
        try {
          const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST", headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: [{ role: "user", content: prompt }], temperature: 0.7, max_tokens: 250 })
          });
          if (!response.ok) throw new Error('API 請求失敗');
          data = await response.json(); break; 
        } catch (error) { lastError = error; if (i === 0) await new Promise(res => setTimeout(res, 500)); }
      }
      if (!data) throw lastError;
      setAiResponse(data.choices[0].message.content);
    } catch (error) { setAiResponse(`【宇宙能量連線不穩】AI 正在甦醒中，請再按一次「開始分析」按鈕！`); } finally { setIsAiLoading(false); }
  };

  const downloadScreenshot = async () => {
    if (!captureRef.current) return;
    try {
      const canvas = await html2canvas(captureRef.current, { backgroundColor: null, scale: 2 });
      const image = canvas.toDataURL("image/png");
      if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) setPreviewImage(image);
      else { const link = document.createElement('a'); link.href = image; link.download = `${isDefaultName ? '今日' : calcName}_印記.png`; link.click(); }
    } catch (error) {}
  };

  const buildPlayerContext = (recordId) => {
    let rec;
    if (recordId === 'current') {
      rec = { name: isDefaultName ? '旅人' : userName, date: date, kin: kinNumber };
    } else {
      rec = savedRecords.find(r => r.id === recordId) || { name: userName, date: date, kin: kinNumber };
    }
    const k = parseInt(rec.kin) || 1;
    const mIdx = k % 20;
    const tNum = ((k - 1) % 13) + 1;
    const wsIdx = (mIdx - (tNum - 1) + 260) % 20;
    const efIdx = mIdx % 5 || 0;
    return {
      name: rec.name || '旅人',
      date: rec.date || '未知',
      kin: k,
      wavespell: seals[wsIdx] ? seals[wsIdx].name : '未知',
      earthFamily: earthFamilies[efIdx] || '未知'
    };
  };

  if (isInitializing) {
    return (
      <div style={{ background: 'linear-gradient(135deg, #fff0f5 0%, #fce4ec 100%)', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        <img src="/Bxc Balance LOGO.png" alt="LOGO" style={{ width: '100px', marginBottom: '25px', opacity: 0.8 }} />
        <h3 style={{ color: '#d81b60', margin: '0 0 10px 0', letterSpacing: '2px' }}>✨ 宇宙能量讀取中 ✨</h3>
      </div>
    );
  }

  return (
    <div style={{ background: 'linear-gradient(135deg, #fff0f5 0%, #fce4ec 100%)', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: 'sans-serif' }}>
      
      {showProfileSetup && user && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', boxSizing: 'border-box' }}>
          <div style={{ background: '#fff', padding: '30px 25px', borderRadius: '24px', width: '100%', maxWidth: '350px', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
            <h2 style={{ color: '#d81b60', margin: '0 0 10px 0' }}>✨ 歡迎來到星系矩陣 ✨</h2>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '25px', lineHeight: '1.5' }}>
              為了讓您在排盤與桌遊中有最完美的體驗，<br/>請先設定您的<strong>「我的主印記」</strong>資料。
            </p>
            <div style={{ textAlign: 'left', marginBottom: '15px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#888' }}>您的姓名或暱稱：</label>
              <input type="text" value={profileInputName} onChange={(e) => setProfileInputName(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #f8bbd0', marginTop: '5px', boxSizing: 'border-box', fontSize: '15px' }} placeholder="請輸入姓名" />
            </div>
            <div style={{ textAlign: 'left', marginBottom: '25px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#888' }}>您的出生年月日：</label>
              <input type="date" value={profileInputDate} onChange={(e) => setProfileInputDate(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #f8bbd0', marginTop: '5px', boxSizing: 'border-box', fontSize: '15px' }} />
            </div>
            <button onClick={handleSaveMyProfile} style={{ width: '100%', padding: '14px', backgroundColor: '#d81b60', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(216, 27, 96, 0.3)' }}>
              確認儲存
            </button>
            {myProfile && (
              <button onClick={() => setShowProfileSetup(false)} style={{ background: 'transparent', border: 'none', color: '#888', marginTop: '15px', cursor: 'pointer', fontSize: '13px' }}>先取消，稍後設定</button>
            )}
          </div>
        </div>
      )}

      {!user ? (
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', width: '100%' }}>
          <div style={{ backgroundColor: '#fff', padding: '50px 30px', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', width: '100%', maxWidth: '350px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <img src="/Bxc Balance LOGO.png" alt="LOGO" style={{ width: '120px', marginBottom: '25px' }} />
            <h2 style={{ color: '#d81b60', margin: '0 0 10px 0', letterSpacing: '1px' }}>登入星系矩陣</h2>
            <button 
              type="button" 
              onClick={handleLineLogin} 
              disabled={isLoginProcessing}
              style={{ width: '100%', padding: '14px', fontSize: '16px', fontWeight: 'bold', color: '#fff', backgroundColor: isLoginProcessing ? '#a5d6a7' : '#06C755', border: 'none', borderRadius: '12px', cursor: isLoginProcessing ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', boxShadow: isLoginProcessing ? 'none' : '0 4px 15px rgba(6, 199, 85, 0.3)', transition: 'background-color 0.3s' }}
            >
              {isLoginProcessing ? ( <><span>🔄</span> 連線星系矩陣中...</> ) : ( <><span style={{ fontSize: '22px' }}>💬</span>使用 LINE 一鍵登入</> )}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ padding: '15px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

          <div style={{ width: '100%', maxWidth: '380px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', padding: '0 5px', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {lineProfile ? (
                <><img src={lineProfile.pictureUrl} alt="頭貼" style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid #f8bbd0', objectFit: 'cover' }} /><span style={{ fontSize: '15px', fontWeight: 'bold', color: '#d81b60' }}>Hi, {lineProfile.displayName}</span></>
              ) : ( <span style={{ fontSize: '14px', color: '#888' }}>Hi, 旅人</span> )}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {showAdminButton && <button onClick={handleAdminClick} style={{ padding: '6px 10px', fontSize: '12px', backgroundColor: showAdminView ? '#1e3a8a' : '#fff', border: '1px solid #1e3a8a', color: showAdminView ? '#fff' : '#1e3a8a', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>{showAdminView ? '✕ 關閉管理' : '⚙️ 管理後台'}</button>}
            </div>
          </div>

          {!showRecordsView && !showAdminView && !adminViewingRecord && (
            <div style={{ display: 'flex', width: '100%', maxWidth: '380px', marginBottom: '15px', backgroundColor: '#fff', borderRadius: '12px', padding: '5px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <button onClick={() => { setActiveTab('query'); setActiveGameRoom(null); setViewingTarget(null); }} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: activeTab === 'query' ? '#ffebee' : 'transparent', color: activeTab === 'query' ? '#d81b60' : '#888', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s', fontSize: '14px' }}>
                🔍 13月亮曆查詢
              </button>
              <button onClick={() => { setActiveTab('game'); setViewingTarget(null); }} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: activeTab === 'game' ? '#e8f5e9' : 'transparent', color: activeTab === 'game' ? '#2e7d32' : '#888', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s', fontSize: '14px' }}>
                🎲 共時旅程桌遊
              </button>
            </div>
          )}

          {showAdminView ? (
            <div style={{ width: '100%', maxWidth: '380px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h3 style={{ color: '#1e3a8a', textAlign: 'center' }}>⚙️ 系統管理後台</h3>
              {!viewingUser ? (
                <>
                  <div style={{ background: '#fff', padding: '15px', borderRadius: '15px', textAlign: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '14px', color: '#888' }}>目前會員總數</div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e3a8a' }}>{allUsersList.length}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                    {allUsersList.map(u => (
                      <div key={u.id} style={{ background: '#fff', padding: '15px', borderRadius: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: u.isAdmin ? '4px solid #d81b60' : '4px solid #cbd5e1', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#333' }}>
                            {getSafeName(u)}
                            {u.isAdmin && <span style={{ marginLeft: '6px', fontSize: '10px', background: '#fce4ec', color: '#d81b60', padding: '2px 6px', borderRadius: '10px' }}>管理員</span>}
                          </span>
                          <span style={{ fontSize: '11px', color: '#888' }}>{u.email || '無信箱資料'}</span>
                          <span style={{ fontSize: '11px', color: '#888', fontWeight: 'bold', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', alignSelf: 'flex-start' }}>加入日期: {formatJoinDate(u)}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <button onClick={() => loadUserRecords(u)} style={{ background: '#e0f2fe', color: '#0284c7', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>查看紀錄</button>
                          {u.isAdmin && user && u.id !== user.uid && (
                            <button onClick={() => removeAdmin(u)} style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', cursor: 'pointer' }}>移除權限</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontWeight: 'bold', color: '#1e3a8a', fontSize: '14px' }}>{getSafeName(viewingUser)} 的紀錄</span>
                    <button onClick={() => setViewingUser(null)} style={{ background: '#f1f5f9', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold', color: '#475569' }}>返回名單</button>
                  </div>
                  {viewingUserRecords.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px', background: '#fff', borderRadius: '15px', color: '#888' }}>此會員尚未儲存任何紀錄</div>
                  ) : (
                    viewingUserRecords.map(record => (
                      <div key={record.id} style={{ backgroundColor: '#fff', borderRadius: '15px', padding: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#333' }}>{record.name}</span>
                          <span style={{ fontSize: '12px', color: '#888' }}>{record.date}</span>
                          <span style={{ fontSize: '12px', color: '#3949ab', fontWeight: 'bold' }}>KIN {record.kin} {record.toneName}的{record.sealName}</span>
                        </div>
                        <button onClick={() => {
                          setAdminViewingRecord({ ...record, fromUser: viewingUser });
                          setShowAdminView(false); setActiveTab('query');
                        }} style={{ padding: '8px 15px', fontSize: '12px', backgroundColor: '#e3f2fd', color: '#1976d2', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>查看排盤</button>
                      </div>
                    ))
                  )}
                </>
              )}
            </div>

          ) : showRecordsView ? (
            <div style={{ width: '100%', maxWidth: '380px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3 style={{ color: '#d81b60', margin: '0' }}>☁️ 親友資料庫</h3>
                <button onClick={() => { setShowRecordsView(false); setViewingTarget('custom'); }} style={{ background: '#f1f5f9', border: 'none', padding: '6px 12px', borderRadius: '8px', fontWeight: 'bold', color: '#64748b', cursor: 'pointer' }}>返回</button>
              </div>
              {savedRecords.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', backgroundColor: '#fff', borderRadius: '15px', color: '#888' }}>尚未儲存任何親友紀錄。<br/>請在查詢親友後按下「儲存至雲端」。</div>
              ) : (
                savedRecords.map(record => (
                  <div key={record.id} style={{ backgroundColor: '#fff', borderRadius: '15px', padding: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#333' }}>{record.name}</span>
                      <span style={{ fontSize: '12px', color: '#888' }}>{record.date}</span>
                      <span style={{ fontSize: '12px', color: '#3949ab', fontWeight: 'bold' }}>KIN {record.kin} {record.toneName}的{record.sealName}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <button onClick={() => { setUserName(record.name); setDate(record.date); setShowRecordsView(false); setViewingTarget('custom'); }} style={{ padding: '6px 15px', fontSize: '12px', backgroundColor: '#e3f2fd', color: '#1976d2', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>排盤</button>
                      <button onClick={() => handleDeleteRecord(record.id)} style={{ padding: '6px 15px', fontSize: '12px', backgroundColor: '#ffebee', color: '#d32f2f', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>刪除</button>
                    </div>
                  </div>
                ))
              )}
            </div>

          ) : activeTab === 'query' ? (
             <div style={{ width: '100%', maxWidth: '380px' }}>
                
                {adminViewingRecord && (
                  <div style={{ width: '100%', maxWidth: '380px', backgroundColor: '#1e293b', color: '#fff', borderRadius: '12px', padding: '12px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', boxSizing: 'border-box', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>目前正在檢視會員資料</span>
                      <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#f8bbd0' }}>
                        {getSafeName(adminViewingRecord.fromUser)}
                      </span>
                    </div>
                    <button onClick={() => { setAdminViewingRecord(null); setShowAdminView(true); }} style={{ backgroundColor: '#d81b60', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                      ✕ 返回管理
                    </button>
                  </div>
                )}

                {viewingTarget === null && !adminViewingRecord ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    
                    <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', marginBottom: '15px' }}>
                        <span style={{ fontWeight: 'bold', color: '#333' }}>我的主印記</span>
                        <span style={{ color: '#888', fontSize: '13px' }}>{myProfile ? `${myProfile.name} ${myProfile.date}` : '尚未設定'}</span>
                      </div>
                      {myProfile ? (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                            <img src={seals[myProfile.kin % 20]?.img} alt="kin" style={{ width: '50px', height: '50px', objectFit: 'contain' }} />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span style={{ fontSize: '18px', fontWeight: '900', color: '#d81b60', letterSpacing: '0.5px' }}>KIN {myProfile.kin}</span>
                              <span style={{ fontSize: '14px', color: '#555', fontWeight: 'bold' }}>{getKinTextInfo(myProfile.kin).toneName}的{getKinTextInfo(myProfile.kin).sealName}</span>
                            </div>
                          </div>
                          <button onClick={() => setViewingTarget('my')} style={{ width: '100%', padding: '10px', background: '#fce4ec', color: '#d81b60', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>查看詳細資訊</button>
                        </>
                      ) : (
                        <button onClick={() => { setProfileInputName(getSafeName(user)); setShowProfileSetup(true); }} style={{ width: '100%', padding: '10px', background: '#d81b60', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>設定我的主印記</button>
                      )}
                    </div>

                    <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', marginBottom: '15px' }}>
                        <span style={{ fontWeight: 'bold', color: '#333' }}>今日宇宙能量</span>
                        <span style={{ color: '#888', fontSize: '13px' }}>{getTodayString()}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                        <img src={todayMainSeal.img} alt="today_kin" style={{ width: '50px', height: '50px', objectFit: 'contain' }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '18px', fontWeight: '900', color: '#3949ab', letterSpacing: '0.5px' }}>KIN {todayKinNumber}</span>
                          <span style={{ fontSize: '14px', color: '#555', fontWeight: 'bold' }}>{todayToneName}的{todayMainSeal.name}</span>
                        </div>
                      </div>
                      <button onClick={() => setViewingTarget('today')} style={{ width: '100%', padding: '10px', background: '#e0e7ff', color: '#3949ab', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>查看詳細資訊</button>
                    </div>

                    <button onClick={() => setViewingTarget('custom')} style={{ width: '100%', padding: '15px', borderRadius: '16px', background: '#f8fafc', border: '2px dashed #cbd5e1', color: '#475569', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                       🔍 查詢親友印記
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                      {!adminViewingRecord && (
                         <button onClick={() => setViewingTarget(null)} style={{ background: '#f1f5f9', border: 'none', padding: '6px 12px', borderRadius: '8px', fontWeight: 'bold', color: '#64748b', cursor: 'pointer' }}>🔙 返回首頁</button>
                      )}
                      {viewingTarget === 'my' && (
                         <button onClick={() => { setProfileInputName(myProfile?.name || getSafeName(user)); setProfileInputDate(myProfile?.date || getTodayString()); setShowProfileSetup(true); }} style={{ background: '#fff', color: '#64748b', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>⚙️ 修改設定</button>
                      )}
                      {viewingTarget === 'custom' && (
                         <button onClick={() => setShowRecordsView(true)} style={{ background: '#e3f2fd', color: '#1976d2', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>📂 親友資料庫</button>
                      )}
                    </div>

                    {viewingTarget === 'custom' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
                        <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                          <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="親友姓名" style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box', minWidth: '0' }} />
                          <input type="date" value={date} onChange={(e) => { if(e.target.value) setDate(e.target.value); }} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box', minWidth: '0' }} />
                        </div>
                        <button onClick={() => handleSaveRecord(false)} style={{ width: '100%', padding: '10px', fontSize: '13px', fontWeight: 'bold', color: '#fff', backgroundColor: '#26a69a', border: 'none', borderRadius: '8px', cursor: 'pointer', boxShadow: '0 4px 10px rgba(38, 166, 154, 0.3)' }}>💾 儲存至雲端資料庫</button>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                      <button onClick={downloadScreenshot} style={{ padding: '8px 15px', fontSize: '12px', fontWeight: 'bold', color: '#fff', backgroundColor: '#ec407a', border: 'none', borderRadius: '8px', cursor: 'pointer', boxShadow: '0 4px 10px rgba(236, 64, 122, 0.3)' }}>📸 另存圖卡</button>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <label style={{ fontSize: '11px', color: '#888', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}><input type="checkbox" checked={showBasicConfig} onChange={() => setShowBasicConfig(!showBasicConfig)} style={{ accentColor: '#d81b60' }} />基礎</label>
                        <label style={{ fontSize: '11px', color: '#888', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}><input type="checkbox" checked={showAdvancedData} onChange={() => setShowAdvancedData(!showAdvancedData)} style={{ accentColor: '#d81b60' }} />高階</label>
                      </div>
                    </div>

                    <div ref={captureRef} style={{ backgroundColor: '#ffffff', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', width: '100%', maxWidth: '380px', padding: '25px 15px 15px 15px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ textAlign: 'center', marginTop: '5px', marginBottom: '25px' }}>
                        <div style={{ fontSize: '16px', color: '#f06292', letterSpacing: '2px', marginBottom: '8px' }}>✨ 星系矩陣 ✨</div>
                        <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                          {isDefaultName ? '此日期的主印記' : `${calcName}的主印記`} {formattedDate}
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
                        <div style={{ gridArea: '2 / 2 / 3 / 3', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <img src={`/tone_${toneNumber}.png`} alt={`調性 ${toneNumber}`} style={{ height: '12px', marginBottom: '6px', objectFit: 'contain' }} />
                          <img src={mainSeal.img} alt="主印記" style={{ width: '72px' }} />
                          <span style={{...labelStyle, fontSize: '10px', marginTop: '4px', marginBottom: '4px'}}>{mainSeal.name}</span>
                          <img src={`/tone_${bottomToneNumber}.png`} alt={`推動調性 ${bottomToneNumber}`} style={{ height: '12px', objectFit: 'contain' }} />
                        </div>
                        <div style={{ gridArea: '2 / 3 / 3 / 4', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><img src={supportSeal.img} alt="支持" style={{ width: '48px' }} /><span style={labelStyle}>支持：{supportSeal.name}</span></div>
                        <div style={{ gridArea: '3 / 2 / 4 / 3', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><img src={hiddenSeal.img} alt="隱藏推動" style={{ width: '48px' }} /><span style={labelStyle}>隱藏推動：{hiddenSeal.name}</span></div>
                      </div>

                      {showBasicConfig && (
                        <div style={reportCardStyle}>
                          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#3949ab', marginBottom: '15px', textAlign: 'center', letterSpacing: '1px' }}>基礎能量配置</div>
                          <div style={reportRowStyle}><div style={reportLabelStyle}>13月亮曆</div><div style={{ ...reportValueStyle, color: '#3949ab' }}>{moonDateDisplay}</div></div>
                          <div style={reportRowStyle}><div style={reportLabelStyle}>所屬城堡</div><div style={{ ...reportValueStyle, color: castleColor }}>⬤ {castleName}</div></div>
                          <div style={reportRowStyle}><div style={reportLabelStyle}>地球家族</div><div style={reportValueStyle}>{earthFamilyName}</div></div>
                          <div style={reportRowStyle}><div style={reportLabelStyle}>引導</div><div style={{...reportValueStyle, color: getSealColor(guideIndex)}}>{guideSeal.name}</div></div>
                          <div style={reportRowStyle}><div style={reportLabelStyle}>支持</div><div style={{...reportValueStyle, color: getSealColor(supportIndex)}}>{supportSeal.name}</div></div>
                          <div style={reportRowStyle}><div style={reportLabelStyle}>挑戰</div><div style={{...reportValueStyle, color: getSealColor(challengeIndex)}}>{challengeSeal.name}</div></div>
                          <div style={{...reportRowStyle, borderBottom: 'none'}}><div style={reportLabelStyle}>推動</div><div style={{...reportValueStyle, color: getSealColor(hiddenIndex)}}>{fullHiddenName} (Kin {fullHiddenKin})</div></div>
                        </div>
                      )}

                      {showAdvancedData && (
                        <div style={{...reportCardStyle, backgroundColor: '#fff0f5', borderColor: '#f8bbd0', padding: '20px 15px'}}>
                          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#d81b60', marginBottom: '15px', textAlign: 'center', letterSpacing: '1px' }}>高階星際數據</div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', width: '100%' }}>
                            <MiniOracleCard title="PSI 記憶" kinNum={psiKinNum} kinDetails={getAdvancedKinDetails(psiKinNum)} oracleDetails={getOracleDetails(psiKinNum)} />
                            <MiniOracleCard title="女神印記" kinNum={goddessKinNum} kinDetails={goddessKinDetails} oracleDetails={getOracleDetails(goddessKinNum)} />
                            <MiniOracleCard title="對等 KIN" kinNum={eqKinNum} kinDetails={eqKinDetails} oracleDetails={getOracleDetails(eqKinNum)} />
                            <MiniOracleCard title="HK21 對等" kinNum={hk21KinNum} kinDetails={hk21Details} oracleDetails={getOracleDetails(hk21KinNum)} />
                          </div>
                        </div>
                      )}

                      <div style={{ marginTop: '20px', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <img src="/Bxc Balance LOGO.png" alt="Bxc Balance LOGO" style={{ width: '120px', height: 'auto', opacity: 0.8, transform: 'translateX(-10px)' }} />
                      </div>
                    </div>

                    {viewingTarget === 'today' && (
                      <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', marginTop: '20px' }}>
                        <h3 style={{ margin: '0 0 15px 0', color: '#d81b60', fontSize: '16px', textAlign: 'center', fontWeight: 'bold', letterSpacing: '1px' }}>✨ 今日流日分析 (AI測試版) ✨</h3>
                        <p style={{ fontSize: '12px', color: '#888', marginBottom: '10px', textAlign: 'center' }}>選擇要計算的對象，結合今日能量取得專屬引導。</p>
                        <div style={{ display: 'flex', gap: '10px', width: '100%', alignItems: 'center' }}>
                          <select
                            value={selectedRecordId}
                            onChange={(e) => setSelectedRecordId(e.target.value)}
                            style={{ flex: 2, padding: '12px 10px', borderRadius: '8px', border: '1px solid #ce93d8', outline: 'none', backgroundColor: '#fafafa', fontSize: '14px', color: '#333' }}
                          >
                            {myProfile && <option value="my">我的主印記 ({myProfile.name})</option>}
                            {savedRecords.length > 0 && (
                              <optgroup label="☁️ 親友資料庫">
                                {savedRecords.map(r => ( <option key={r.id} value={r.id}>{r.name} (Kin {r.kin})</option> ))}
                              </optgroup>
                            )}
                          </select>
                          <button onClick={handleGenerateGuidance} disabled={isAiLoading} style={{ flex: 1, padding: '12px 5px', fontSize: '14px', fontWeight: 'bold', color: '#fff', backgroundColor: '#ab47bc', border: 'none', borderRadius: '8px', cursor: isAiLoading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 10px rgba(171, 71, 188, 0.3)' }}>
                            {isAiLoading ? '解析中...' : '開始分析'}
                          </button>
                        </div>
                        {aiResponse && dailyFlowInfo && (
                          <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f3e5f5', borderRadius: '15px', border: '1px solid #e1bee7', width: '100%', boxSizing: 'border-box' }}>
                            
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '15px', paddingBottom: '12px', borderBottom: '1px dashed #ce93d8' }}>
                              <span style={{ fontSize: '13px', color: '#8e24aa', fontWeight: 'bold' }}>你今日流日</span>
                              <img src={dailyFlowInfo.seal.img} alt="kin" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
                              <span style={{ fontSize: '14px', fontWeight: '900', color: '#d81b60' }}>KIN {dailyFlowInfo.kin} {dailyFlowInfo.toneName}的{dailyFlowInfo.seal.name}</span>
                            </div>

                            <h4 style={{ color: '#8e24aa', margin: '0 0 8px 0', fontSize: '14px', textAlign: 'center' }}>✨ 專屬宇宙導航</h4>
                            <p style={{ color: '#4a148c', fontSize: '14px', lineHeight: '1.7', margin: 0, textAlign: 'justify', whiteSpace: 'pre-line' }}>{aiResponse}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
             </div>
          ) : activeTab === 'game' ? (
            <>
              {!isGameUnlocked ? (
                <div style={{ width: '100%', maxWidth: '380px', backgroundColor: '#fff', borderRadius: '16px', padding: '30px 20px', textAlign: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                  <h2 style={{ color: '#d81b60', marginTop: 0 }}>🔒 封閉測試中</h2>
                  <input type="password" placeholder="請輸入邀請碼" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ce93d8', marginBottom: '15px', textAlign: 'center', fontSize: '18px', letterSpacing: '3px' }} />
                  <button onClick={() => { if (inviteCode === '095') { setIsGameUnlocked(true); localStorage.setItem('bxc_game_unlocked', 'true'); } else { alert('❌ 邀請碼錯誤！'); setInviteCode(''); } }} style={{ width: '100%', padding: '14px', background: '#d81b60', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>確認解鎖</button>
                </div>
              ) : !activeGameRoom ? (
                <GameLobbyManager 
                  user={user} 
                  myProfile={myProfile} 
                  savedRecords={savedRecords}
                  buildPlayerContext={buildPlayerContext}
                  onEnterGame={(roomData) => setActiveGameRoom(roomData)} 
                />
              ) : (
                <div style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <BoardGameRecord 
                     user={user} 
                     activeGameRoom={activeGameRoom}
                     onBack={() => setActiveGameRoom(null)} 
                  />
                </div>
              )}
            </>
          ) : null}

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
