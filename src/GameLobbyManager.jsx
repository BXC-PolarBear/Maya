// src/GameLobbyManager.jsx
import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, doc, setDoc, getDoc, updateDoc, onSnapshot, arrayUnion, serverTimestamp, query, where, getDocs } from 'firebase/firestore';

// 🌟 引入 LINE LIFF 與 QR Code 相關套件
import liff from '@line/liff';
import QRCode from 'react-qr-code';
import { Scanner } from '@yudiel/react-qr-scanner';

// 🌟 引入牌卡資料與圖騰引擎
import { seals, earthFamilies } from './mayaEngine';
import { cardsData } from './cardsData';

const getCardIcon = (imgStr) => {
  if (!imgStr) return '';
  if (imgStr.startsWith('T')) {
    const toneNum = parseInt(imgStr.substring(1), 10);
    return `/tone_${toneNum}.png`;
  } else {
    const sealNum = parseInt(imgStr, 10);
    if (sealNum >= 1 && sealNum <= 20) {
      const paddedNum = sealNum.toString().padStart(2, '0');
      return `/${paddedNum}.png`;
    }
  }
  return '';
};

// 🎨 全新高質感：莫蘭迪色系 (卡牌圖鑑外框與標籤使用)
const colorStyles = {
  '紅': '#C87A7E',
  '白': '#C4C1BC', 
  '藍': '#829BAC',
  '黃': '#D1B475',
  '綠': '#8D9F8C'
};

const CardDisplay = ({ card }) => {
  if (!card) return null;
  const [cId, cText, cImg, cColorStr, cType] = card;
  const borderHex = colorStyles[cColorStr] || '#cbd5e1';

  return (
    <div style={{
      width: '180px', height: '260px',
      backgroundColor: '#fff', border: `6px solid ${borderHex}`,
      borderRadius: '16px', position: 'relative',
      boxShadow: '0 6px 12px rgba(0,0,0,0.08)', padding: '16px',
      boxSizing: 'border-box', display: 'flex', flexDirection: 'column',
      backgroundImage: 'linear-gradient(to bottom right, rgba(255,255,255,1), rgba(245,245,245,0.6))',
      margin: '0 auto'
    }}>
      <div style={{ position: 'absolute', top: '10px', left: '12px', fontSize: '18px', fontWeight: '900', color: borderHex, fontFamily: 'monospace', textShadow: '1px 1px 0px rgba(255,255,255,0.8)' }}>
        #{cId}
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '24px', marginBottom: '28px', overflowY: 'auto' }}>
        <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#334155', textAlign: 'center', lineHeight: '1.6', letterSpacing: '0.5px' }}>
          {cText}
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: '12px', left: '12px', backgroundColor: borderHex, color: '#fff', fontSize: '11px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '6px', letterSpacing: '1px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        {cType}
      </div>
      <div style={{ position: 'absolute', bottom: '10px', right: '10px', width: '34px', height: '34px', backgroundColor: '#f8fafc', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${borderHex}`, boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}>
        {getCardIcon(cImg) && <img src={getCardIcon(cImg)} alt="icon" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />}
      </div>
    </div>
  );
};

export default function GameLobbyManager({ user, myProfile, savedRecords, buildPlayerContext, onEnterGame }) {
  const [view, setView] = useState('home'); 
  const [roomName, setRoomName] = useState('');
  const [isHostPlaying, setIsHostPlaying] = useState(true);
  const [joinCode, setJoinCode] = useState('');

  const [currentRoom, setCurrentRoom] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // 🌟 角色選擇預設值：直接設為 'my' (我的主印記)
  const [selectedRecordId, setSelectedRecordId] = useState('my');

  // 🌟 當載入到我的主印記時，強制把預設選項設為「我的主印記」
  useEffect(() => {
    if (myProfile) setSelectedRecordId('my');
  }, [myProfile]);

  const [myRooms, setMyRooms] = useState([]);
  const [isScanning, setIsScanning] = useState(false);

  const [dictMode, setDictMode] = useState('search'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [randomCard, setRandomCard] = useState(null);

  const displayedCards = searchQuery.trim() 
    ? cardsData.filter(c => c[0].toLowerCase().includes(searchQuery.toLowerCase()) || c[1].toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 10)
    : [];

  const handleDrawCard = () => {
    setRandomCard(null);
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * cardsData.length);
      setRandomCard(cardsData[randomIndex]);
    }, 50);
  };

  useEffect(() => {
    if (view === 'home' && user) {
      const fetchMyRooms = async () => {
        try {
          const q = query(collection(db, 'game_rooms'), where('playerIds', 'array-contains', user.uid));
          const querySnapshot = await getDocs(q);
          const rooms = querySnapshot.docs.map(doc => doc.data());
          rooms.sort((a, b) => (b.lastActivityAt || 0) - (a.lastActivityAt || 0));
          setMyRooms(rooms);
        } catch (error) { console.error("讀取歷史紀錄失敗:", error); }
      };
      fetchMyRooms();
    }
  }, [view, user]);

  const generateRoomCode = () => {
    const today = new Date();
    const yy = String(today.getFullYear()).slice(-2);
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const datePrefix = `${yy}${mm}${dd}`;
    const randomSeq = Math.floor(1000 + Math.random() * 9000);
    return { code: `${datePrefix}${randomSeq}`, datePrefix };
  };

  // 🌟 自動根據選擇建構玩家資訊
  const getPlayerInfo = () => {
    if (selectedRecordId === 'my' && myProfile) {
      const k = parseInt(myProfile.kin) || 1;
      const mIdx = k % 20;
      const tNum = ((k - 1) % 13) + 1;
      const wsIdx = (mIdx - (tNum - 1) + 260) % 20;
      const efIdx = mIdx % 5 || 0;
      return {
        name: myProfile.name,
        date: myProfile.date,
        kin: k,
        wavespell: seals[wsIdx] ? seals[wsIdx].name : '未知',
        earthFamily: earthFamilies[efIdx] || '未知'
      };
    }
    // 如果不是我的主印記，就是親友資料庫的 ID
    return buildPlayerContext(selectedRecordId);
  };

  const handleCreateRoom = async () => {
    if (!roomName.trim()) return setErrorMsg('請輸入桌名！');
    if (!user) return setErrorMsg('請先登入！');

    try {
      const { code, datePrefix } = generateRoomCode();
      const newRoom = {
        id: code, name: roomName, hostId: user.uid, hostName: getPlayerInfo().name,
        isHostPlaying, status: 'waiting', players: [], playerIds: [user.uid],
        datePrefix, createdAt: serverTimestamp(), lastActivityAt: Date.now()
      };

      if (isHostPlaying) {
        const playerInfo = { uid: user.uid, isHost: true, ...getPlayerInfo() };
        newRoom.players.push(playerInfo);
      }

      await setDoc(doc(db, 'game_rooms', code), newRoom);
      setCurrentRoom(newRoom); 
      setView('waiting'); 
      setErrorMsg('');
    } catch (error) { setErrorMsg('開桌失敗，請確認網路連線。'); }
  };

  const handleJoinRoom = async () => {
    if (!joinCode.trim() || joinCode.length !== 10) return setErrorMsg('請輸入正確的 10 碼桌次代碼！');
    if (!user) return setErrorMsg('請先登入！');

    try {
      const roomRef = doc(db, 'game_rooms', joinCode);
      const roomSnap = await getDoc(roomRef);
      if (!roomSnap.exists()) return setErrorMsg('找不到此桌次代碼！');

      const roomData = roomSnap.data();
      if (roomData.status === 'ended') return setErrorMsg('這場遊戲已經結束囉！');
      if (roomData.status === 'playing') return setErrorMsg('遊戲已經開始，無法加入！');
      if (roomData.players.length >= 5) return setErrorMsg('這桌已經客滿囉 (上限 5 人)！');

      if (!roomData.players.some(p => p.uid === user.uid)) {
        const playerInfo = { uid: user.uid, isHost: false, ...getPlayerInfo() };
        await updateDoc(roomRef, {
          players: arrayUnion(playerInfo), 
          playerIds: arrayUnion(user.uid), 
          lastActivityAt: Date.now()
        });
      }
      setCurrentRoom(roomData);
      setView('waiting'); 
      setErrorMsg('');
    } catch (error) { setErrorMsg('加入失敗，請檢查網路連線。'); }
  };

  const currentRoomId = currentRoom ? currentRoom.id : null;

  useEffect(() => {
    if (view === 'waiting' && currentRoomId) {
      const roomRef = doc(db, 'game_rooms', currentRoomId);
      const unsubscribe = onSnapshot(roomRef, (docSnap) => {
        if (docSnap.exists()) {
          const updatedRoom = docSnap.data();

          // 🌟 安全機制：檢查自己是否被剔除或已主動退出
          if (!updatedRoom.playerIds.includes(user.uid)) {
             alert("您已離開此桌或被桌長移除。");
             setCurrentRoom(null);
             setView('home');
             return;
          }

          setCurrentRoom(prev => ({ ...updatedRoom })); 
          if (updatedRoom.status === 'playing' || updatedRoom.status === 'ended') {
             onEnterGame(updatedRoom);
          }
        }
      });
      return () => unsubscribe();
    }
  }, [view, currentRoomId, onEnterGame, user.uid]); 

  const handleStartGame = async () => {
    if (!currentRoom) return;
    try { await updateDoc(doc(db, 'game_rooms', currentRoom.id), { status: 'playing', lastActivityAt: Date.now() }); } 
    catch (error) { setErrorMsg('啟動遊戲失敗。'); }
  };

  const handleStartScan = async () => {
    setErrorMsg('');
    if (liff.isInClient() && liff.scanCodeV2) {
      try {
        const result = await liff.scanCodeV2();
        if (result && result.value) setJoinCode(result.value);
      } catch (err) { setIsScanning(true); }
    } else {
      setIsScanning(true);
    }
  };

  // 🌟 桌長移除玩家功能
  const handleKickPlayer = async (targetUid, targetName) => {
    if (!window.confirm(`確定要將 ${targetName} 移出遊戲桌嗎？`)) return;
    if (!currentRoom) return;
    try {
      const newPlayers = currentRoom.players.filter(p => p.uid !== targetUid);
      const newPlayerIds = currentRoom.playerIds.filter(id => id !== targetUid);
      await updateDoc(doc(db, 'game_rooms', currentRoom.id), { players: newPlayers, playerIds: newPlayerIds });
    } catch(e) { alert("移除失敗！"); }
  };

  // 🌟 成員主動退出功能
  const handleLeaveRoom = async () => {
    if (!window.confirm("確定要退出這個遊戲桌嗎？")) return;
    if (!currentRoom) return;
    try {
      const newPlayers = currentRoom.players.filter(p => p.uid !== user.uid);
      const newPlayerIds = currentRoom.playerIds.filter(id => id !== user.uid);
      await updateDoc(doc(db, 'game_rooms', currentRoom.id), { players: newPlayers, playerIds: newPlayerIds });
      setCurrentRoom(null);
      setView('home');
    } catch(e) { alert("退出失敗！"); }
  };

  // 🌟 全新設計的防呆選單 (拔除臨時自訂)
  const CharacterSelect = () => (
    <div style={{ marginBottom: '15px' }}>
      <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#555' }}>選擇參與遊戲的身份角色：</label>
      <select value={selectedRecordId} onChange={e => setSelectedRecordId(e.target.value)} style={{ width: '100%', padding: '12px 10px', borderRadius: '8px', border: '1px solid #ccc', marginTop: '5px', fontSize: '14px', backgroundColor: '#fafafa', outline: 'none' }}>

        {myProfile && (
          <option value="my" style={{ fontWeight: 'bold' }}>👑 我的主印記 ({myProfile.name} - KIN {myProfile.kin})</option>
        )}

        {savedRecords && savedRecords.length > 0 && (
          <optgroup label="👥 親友資料庫">
            {savedRecords.map(r => ( <option key={r.id} value={r.id}>{r.name} (KIN {r.kin})</option> ))}
          </optgroup>
        )}
      </select>
    </div>
  );

  const containerStyle = { width: '100%', maxWidth: '380px', background: '#fff', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', boxSizing: 'border-box' };
  const inputStyle = { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '16px' };
  const btnStyle = { width: '100%', padding: '14px', borderRadius: '12px', border: 'none', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' };

  return (
    <div style={containerStyle}>
      <h2 style={{ textAlign: 'center', color: '#d81b60', marginTop: 0 }}>🎲 共時旅程連線大廳</h2>
      {errorMsg && <div style={{ background: '#ffebee', color: '#c62828', padding: '10px', borderRadius: '8px', marginBottom: '15px', fontSize: '14px', textAlign: 'center' }}>{errorMsg}</div>}

      {view === 'home' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px' }}>
          <button onClick={() => setView('create')} style={{ ...btnStyle, background: '#3949ab', color: '#fff' }}>👑 我要開桌 (當桌長)</button>
          <button onClick={() => setView('join')} style={{ ...btnStyle, background: '#26a69a', color: '#fff' }}>🙋‍♂️ 我要加入 (當成員)</button>

          <button onClick={() => { setView('dictionary'); setDictMode('search'); }} style={{ ...btnStyle, background: '#8b5cf6', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
            <span>🔍</span> 牌卡圖鑑 & 隨機抽卡 <span>🎲</span>
          </button>

          <div style={{ marginTop: '20px', borderTop: '1px dashed #ccc', paddingTop: '15px' }}>
            <h3 style={{ fontSize: '15px', color: '#333', marginBottom: '10px' }}>📜 我的遊戲紀錄</h3>
            {myRooms.length === 0 ? <div style={{ fontSize: '13px', color: '#888', textAlign: 'center' }}>尚未參與任何遊戲</div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {myRooms.map(room => (
                  <div key={room.id} onClick={() => { setCurrentRoom(room); setView('waiting'); }} style={{ background: '#f8f9fa', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}><span style={{ fontSize: '14px', fontWeight: 'bold', color: '#333' }}>{room.name}</span><span style={{ fontSize: '11px', color: '#64748b' }}>代碼: {room.id}</span></div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}><span style={{ fontSize: '13px' }}>{room.status === 'playing' ? '🎮 進行中' : room.status === 'waiting' ? '⏳ 等待中' : '🏁 已結束'}</span><span style={{ fontSize: '12px', color: '#888' }}>{room.players.length} 人</span></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {view === 'dictionary' && (
        <div style={{ animation: 'fadeIn 0.3s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, color: '#333', fontSize: '16px' }}>📖 牌卡圖鑑與抽卡</h3>
            <button onClick={() => setView('home')} style={{ background: '#f1f5f9', border: 'none', padding: '6px 12px', borderRadius: '8px', fontWeight: 'bold', color: '#64748b', cursor: 'pointer' }}>返回</button>
          </div>

          <div style={{ display: 'flex', width: '100%', marginBottom: '15px', backgroundColor: '#f8fafc', borderRadius: '12px', padding: '4px', border: '1px solid #e2e8f0' }}>
            <button onClick={() => setDictMode('search')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: dictMode === 'search' ? '#e0e7ff' : 'transparent', color: dictMode === 'search' ? '#4f46e5' : '#888', fontWeight: 'bold', cursor: 'pointer' }}>
              🔍 關鍵字搜尋
            </button>
            <button onClick={() => setDictMode('random')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: dictMode === 'random' ? '#fce4ec' : 'transparent', color: dictMode === 'random' ? '#d81b60' : '#888', fontWeight: 'bold', cursor: 'pointer' }}>
              🎲 隨機抽卡
            </button>
          </div>

          {dictMode === 'search' && (
            <div style={{ background: '#fff', borderRadius: '12px', padding: '15px', border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
              <div style={{ position: 'relative', marginBottom: '15px' }}>
                <input 
                  type="text" 
                  placeholder="輸入卡牌編號或關鍵字..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '10px 35px 10px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '14px', outline: 'none' }}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '10px', top: '10px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>✖</button>
                )}
              </div>

              {searchQuery.trim() !== '' && (
                <div>
                  {displayedCards.length > 0 ? (
                    <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '15px', scrollSnapType: 'x mandatory' }}>
                      {displayedCards.map(card => (
                        <div key={card[0]} style={{ flex: '0 0 180px', scrollSnapAlign: 'start' }}>
                          <CardDisplay card={card} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '13px', color: '#888', textAlign: 'center', padding: '20px 0' }}>找不到符合的牌卡 🙈</div>
                  )}
                </div>
              )}
            </div>
          )}

          {dictMode === 'random' && (
            <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0', textAlign: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px', lineHeight: '1.5' }}>
                閉上眼睛，在心中默念您的問題或目前的困境，然後按下按鈕，抽出宇宙給您的指引。
              </p>
              <button onClick={handleDrawCard} style={{ background: 'linear-gradient(135deg, #d81b60 0%, #8e24aa 100%)', color: '#fff', border: 'none', padding: '14px 24px', borderRadius: '30px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(216, 27, 96, 0.4)', marginBottom: '25px' }}>
                ✨ 抽出宇宙的指引
              </button>

              {randomCard && (
                <div style={{ animation: 'fadeIn 0.6s cubic-bezier(0.39, 0.575, 0.565, 1)', display: 'flex', justifyContent: 'center' }}>
                  <CardDisplay card={randomCard} />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {view === 'create' && (
        <div>
          <h3 style={{ fontSize: '16px', color: '#333' }}>開桌設定</h3>
          <input type="text" placeholder="為這桌取個名字" value={roomName} onChange={(e) => setRoomName(e.target.value)} style={{...inputStyle, marginBottom: '15px'}} />
          <CharacterSelect />
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', cursor: 'pointer', fontSize: '14px', color: '#555' }}>
            <input type="checkbox" checked={isHostPlaying} onChange={(e) => setIsHostPlaying(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#3949ab' }} /> 桌長是否親自下場玩遊戲？
          </label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setView('home')} style={{ ...btnStyle, background: '#f1f5f9', color: '#64748b', flex: 1 }}>返回</button>
            <button onClick={handleCreateRoom} style={{ ...btnStyle, background: '#3949ab', color: '#fff', flex: 2 }}>生成代碼</button>
          </div>
        </div>
      )}

      {view === 'join' && (
        <div>
          <h3 style={{ fontSize: '16px', color: '#333' }}>加入遊戲</h3>
          <p style={{ fontSize: '13px', color: '#888', marginBottom: '15px' }}>請輸入代碼，或點擊掃描桌長的手機畫面</p>

          {isScanning ? (
            <div style={{ marginBottom: '15px', borderRadius: '12px', overflow: 'hidden', border: '2px solid #26a69a' }}>
              <Scanner 
                onScan={(result) => {
                  if (result && result.length > 0) {
                    const code = result[0].rawValue;
                    if (code) setJoinCode(code);
                    setIsScanning(false);
                  }
                }}
                onError={(err) => console.log(err)}
              />
              <button onClick={() => setIsScanning(false)} style={{ width: '100%', padding: '10px', background: '#f1f5f9', border: 'none', color: '#ef4444', fontWeight: 'bold', cursor: 'pointer' }}>取消相機</button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              <input type="text" placeholder="輸入10碼數字" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} style={{...inputStyle, flex: 1, letterSpacing: '1px'}} maxLength={10} />
              <button onClick={handleStartScan} style={{ padding: '0 15px', background: '#e0f2fe', color: '#0284c7', border: '1px solid #0284c7', borderRadius: '8px', cursor: 'pointer', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                📷
              </button>
            </div>
          )}

          <CharacterSelect />
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => { setView('home'); setIsScanning(false); }} style={{ ...btnStyle, background: '#f1f5f9', color: '#64748b', flex: 1 }}>返回</button>
            <button onClick={handleJoinRoom} style={{ ...btnStyle, background: '#26a69a', color: '#fff', flex: 2 }}>確認加入</button>
          </div>
        </div>
      )}

      {view === 'waiting' && currentRoom && (
        <div style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: '18px', color: '#333', margin: '0 0 10px 0' }}>{currentRoom.name}</h3>

          <div style={{ background: '#f3e5f5', padding: '20px', borderRadius: '16px', border: '1px dashed #ce93d8', marginBottom: '20px' }}>
            <p style={{ fontSize: '12px', color: '#8e24aa', margin: '0 0 5px 0', fontWeight: 'bold' }}>請成員掃描此 QR Code 加入</p>
            <div style={{ display: 'inline-block', background: '#fff', padding: '10px', borderRadius: '12px', marginBottom: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
               <QRCode value={currentRoom.id} size={160} fgColor="#4a148c" />
            </div>
            <p style={{ fontSize: '12px', color: '#888', margin: '0 0 5px 0' }}>或手動輸入代碼</p>
            <h2 style={{ margin: 0, fontSize: '32px', color: '#4a148c', letterSpacing: '4px' }}>{currentRoom.id}</h2>
          </div>

          <div style={{ background: '#fafafa', padding: '15px', borderRadius: '12px', marginBottom: '20px', textAlign: 'left' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#555' }}>👥 等待中的玩家 ({currentRoom.players.length}/5)</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentRoom.players.map((p, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #eee' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#333' }}>
                      {p.name} 
                      {p.isHost && <span style={{ fontSize: '10px', background: '#ffc107', padding: '2px 6px', borderRadius: '10px', marginLeft: '6px' }}>桌長</span>}
                      {p.uid === user?.uid && <span style={{ fontSize: '10px', background: '#e0f2fe', color: '#0284c7', padding: '2px 6px', borderRadius: '10px', marginLeft: '6px' }}>自己</span>}
                    </span>
                    <span style={{ fontSize: '12px', color: '#888' }}>KIN {p.kin}</span>
                  </div>

                  {/* 🌟 只有桌長可以看到踢人按鈕，且不能踢自己 */}
                  {currentRoom.hostId === user?.uid && p.uid !== user?.uid && (
                    <button 
                      onClick={() => handleKickPlayer(p.uid, p.name)} 
                      style={{ background: '#fee2e2', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px', padding: '6px 10px', borderRadius: '6px', fontWeight: 'bold' }}
                    >
                      移除
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {currentRoom.hostId === user?.uid ? (
               <button onClick={handleStartGame} style={{ ...btnStyle, background: '#d81b60', color: '#fff' }}>🚀 確認人數，開始遊戲</button>
            ) : ( 
              <>
               <div style={{ padding: '15px', background: '#e0f2fe', color: '#0284c7', borderRadius: '12px', fontWeight: 'bold' }}>⏳ 等待桌長按下開始...</div>
               {/* 🌟 成員主動退出按鈕 */}
               <button onClick={handleLeaveRoom} style={{ ...btnStyle, background: '#fee2e2', color: '#ef4444', marginTop: '5px' }}>🚪 退出遊戲</button>
              </>
            )}
            <button onClick={() => setView('home')} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontWeight: 'bold', padding: '10px' }}>🔙 返回大廳首頁</button>
          </div>
        </div>
      )}
    </div>
  );
}
