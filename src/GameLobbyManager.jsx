// src/GameLobbyManager.jsx
import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, doc, setDoc, getDoc, updateDoc, onSnapshot, arrayUnion, serverTimestamp, query, where, getDocs } from 'firebase/firestore';

export default function GameLobbyManager({ user, savedRecords, buildPlayerContext, onEnterGame }) {
  const [view, setView] = useState('home'); 
  const [roomName, setRoomName] = useState('');
  const [isHostPlaying, setIsHostPlaying] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const [currentRoom, setCurrentRoom] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // 🌟 選擇要遊玩的角色紀錄
  const [selectedRecordId, setSelectedRecordId] = useState('current');
  const [myRooms, setMyRooms] = useState([]);

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

  const handleCreateRoom = async () => {
    if (!roomName.trim()) return setErrorMsg('請輸入桌名！');
    if (!user) return setErrorMsg('請先登入！');

    try {
      const { code, datePrefix } = generateRoomCode();
      const newRoom = {
        id: code, name: roomName, hostId: user.uid, hostName: buildPlayerContext('current').name,
        isHostPlaying, status: 'waiting', players: [], playerIds: [user.uid],
        datePrefix, createdAt: serverTimestamp(), lastActivityAt: Date.now()
      };

      if (isHostPlaying) {
        const playerContext = buildPlayerContext(selectedRecordId);
        newRoom.players.push({ uid: user.uid, isHost: true, ...playerContext });
      }

      await setDoc(doc(db, 'game_rooms', code), newRoom);
      setCurrentRoom(newRoom); setView('waiting'); setErrorMsg('');
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

      if (roomData.players.some(p => p.uid === user.uid)) {
        setCurrentRoom(roomData); setView('waiting'); return;
      }

      const playerContext = buildPlayerContext(selectedRecordId);
      const playerInfo = { uid: user.uid, isHost: false, ...playerContext };

      await updateDoc(roomRef, {
        players: arrayUnion(playerInfo), playerIds: arrayUnion(user.uid), lastActivityAt: Date.now()
      });

      setCurrentRoom({ ...roomData, players: [...roomData.players, playerInfo] });
      setView('waiting'); setErrorMsg('');
    } catch (error) { setErrorMsg('加入失敗，請檢查網路連線。'); }
  };

  useEffect(() => {
    if (view === 'waiting' && currentRoom) {
      const roomRef = doc(db, 'game_rooms', currentRoom.id);
      const unsubscribe = onSnapshot(roomRef, (docSnap) => {
        if (docSnap.exists()) {
          const updatedRoom = docSnap.data();
          setCurrentRoom(updatedRoom);
          if (updatedRoom.status === 'playing' || updatedRoom.status === 'ended') {
             onEnterGame(updatedRoom);
          }
        }
      });
      return () => unsubscribe();
    }
  }, [view, currentRoom, onEnterGame]);

  const handleStartGame = async () => {
    if (!currentRoom) return;
    try {
      await updateDoc(doc(db, 'game_rooms', currentRoom.id), { status: 'playing', lastActivityAt: Date.now() });
    } catch (error) { setErrorMsg('啟動遊戲失敗。'); }
  };

  // --- UI 元件 ---
  const CharacterSelect = () => (
    <div style={{ marginBottom: '15px' }}>
      <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#555' }}>選擇參與遊戲的雲端紀錄：</label>
      <select value={selectedRecordId} onChange={e => setSelectedRecordId(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', marginTop: '5px' }}>
        <option value="current">👤 目前首頁輸入的資料 ({buildPlayerContext('current').name})</option>
        {savedRecords && savedRecords.map(r => (
          <option key={r.id} value={r.id}>☁️ {r.name} (KIN {r.kin})</option>
        ))}
      </select>
    </div>
  );

  const containerStyle = { width: '100%', maxWidth: '380px', background: '#fff', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', boxSizing: 'border-box' };
  const inputStyle = { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', marginBottom: '15px', boxSizing: 'border-box', fontSize: '16px' };
  const btnStyle = { width: '100%', padding: '14px', borderRadius: '12px', border: 'none', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', marginBottom: '10px' };

  return (
    <div style={containerStyle}>
      <h2 style={{ textAlign: 'center', color: '#d81b60', marginTop: 0 }}>🎲 共時旅程連線大廳</h2>
      {errorMsg && <div style={{ background: '#ffebee', color: '#c62828', padding: '10px', borderRadius: '8px', marginBottom: '15px', fontSize: '14px', textAlign: 'center' }}>{errorMsg}</div>}

      {view === 'home' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px' }}>
          <button onClick={() => setView('create')} style={{ ...btnStyle, background: '#3949ab', color: '#fff' }}>👑 我要開桌 (當桌長)</button>
          <button onClick={() => setView('join')} style={{ ...btnStyle, background: '#26a69a', color: '#fff' }}>🙋‍♂️ 我要加入 (當成員)</button>

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

      {view === 'create' && (
        <div>
          <h3 style={{ fontSize: '16px', color: '#333' }}>開桌設定</h3>
          <input type="text" placeholder="為這桌取個名字" value={roomName} onChange={(e) => setRoomName(e.target.value)} style={inputStyle} />
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
          <input type="text" placeholder="輸入 10 碼桌次代碼" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} style={inputStyle} maxLength={10} />
          <CharacterSelect />
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setView('home')} style={{ ...btnStyle, background: '#f1f5f9', color: '#64748b', flex: 1 }}>返回</button>
            <button onClick={handleJoinRoom} style={{ ...btnStyle, background: '#26a69a', color: '#fff', flex: 2 }}>確認加入</button>
          </div>
        </div>
      )}

      {view === 'waiting' && currentRoom && (
        <div style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: '18px', color: '#333', margin: '0 0 10px 0' }}>{currentRoom.name}</h3>
          <div style={{ background: '#f3e5f5', padding: '15px', borderRadius: '12px', border: '1px dashed #ce93d8', marginBottom: '20px' }}>
            <p style={{ fontSize: '12px', color: '#8e24aa', margin: '0 0 5px 0' }}>桌次代碼</p>
            <h2 style={{ margin: 0, fontSize: '28px', color: '#4a148c', letterSpacing: '2px' }}>{currentRoom.id}</h2>
          </div>
          <div style={{ background: '#fafafa', padding: '15px', borderRadius: '12px', marginBottom: '20px', textAlign: 'left' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#555' }}>👥 等待中的玩家</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentRoom.players.map((p, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #eee' }}>
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#333' }}>{p.name} {p.isHost && <span style={{ fontSize: '10px', background: '#ffc107', padding: '2px 6px', borderRadius: '10px', marginLeft: '5px' }}>桌長</span>}</span>
                  <span style={{ fontSize: '12px', color: '#888' }}>KIN {p.kin}</span>
                </div>
              ))}
            </div>
          </div>
          {currentRoom.hostId === user?.uid ? (
             <button onClick={handleStartGame} style={{ ...btnStyle, background: '#d81b60', color: '#fff' }}>🚀 確認人數，開始遊戲</button>
          ) : ( <div style={{ padding: '15px', background: '#e0f2fe', color: '#0284c7', borderRadius: '12px', fontWeight: 'bold' }}>⏳ 等待桌長按下開始...</div> )}
          <button onClick={() => setView('home')} style={{ marginTop: '15px', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontWeight: 'bold' }}>返回大廳首頁</button>
        </div>
      )}
    </div>
  );
}