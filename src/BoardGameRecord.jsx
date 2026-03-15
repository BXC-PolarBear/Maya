// src/BoardGameRecord.jsx
import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { doc, updateDoc, setDoc, getDoc, collection, query, onSnapshot } from 'firebase/firestore';
import { seals, toneNames } from './mayaEngine'; 
import { cardsData } from './cardsData'; 

const cardColors = [
  { id: 'red', name: '🔴 未知探索', hex: '#ef4444' },
  { id: 'white', name: '⚪ 內觀梳理', hex: '#d1d5db' },
  { id: 'blue', name: '🔵 蛻變進擊', hex: '#3b82f6' },
  { id: 'yellow', name: '🟡 實踐成就', hex: '#eab308' },
  { id: 'green', name: '🟢 顯化矩陣', hex: '#22c55e' }
];

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

const frequencyStages = [
  { max: 200, name: '基礎階段 孕育・沃土', desc: '高維度頻率能量，如土壤般包容一切可能。' },
  { max: 400, name: '初生階段 萌芽・破土', desc: '蘊含無限可能性與期待，準備向外探索。' },
  { max: 600, name: '發展階段 定向・茁壯', desc: '方向明確，力量漸趨健全有力。' },
  { max: 800, name: '成熟階段 穩固・堅韌', desc: '歷經淬鍊，擁有厚實堅韌的生命底蘊。' },
  { max: 10000, name: '鼎盛階段 繁盛・成蔭', desc: '能量豐盛，能為他人帶來庇蔭與深遠影響力。' }
];

export default function BoardGameRecord({ user, activeGameRoom, onBack }) {
  const isHost = activeGameRoom.hostId === user.uid;
  const isHostPlaying = activeGameRoom.isHostPlaying;
  const amIPlaying = !isHost || isHostPlaying; 
  
  const myData = activeGameRoom.players.find(p => p.uid === user.uid) || {};

  const [activeTab, setActiveTab] = useState(amIPlaying ? 'my_game' : 'player_list');
  const [dataLoaded, setDataLoaded] = useState(!amIPlaying); 

  let fullKinName = `KIN ${myData.kin || '未知'}`;
  if (myData.kin) {
    const kNum = parseInt(myData.kin, 10);
    if (!isNaN(kNum)) {
      const tNum = ((kNum - 1) % 13) + 1;
      const mIdx = kNum % 20;
      fullKinName = `KIN ${kNum} ${toneNames[tNum - 1] || ''}的${seals[mIdx] ? seals[mIdx].name : ''}`;
    }
  }

  const [setup, setSetup] = useState({
    r1: { startAge: '', startKin: '', yearAge: '', yearKin: '' },
    r2: { startAge: '', startKin: '', yearAge: '', yearKin: '' },
    r3: { startAge: '', startKin: '', yearAge: '', yearKin: '' },
    end: { age: '', kin: '' }
  });
  
  const handleSetupChange = (round, field, value) => {
    setSetup(prev => ({ ...prev, [round]: { ...prev[round], [field]: value } }));
  };

  const [activeRound, setActiveRound] = useState(1);
  const [rounds, setRounds] = useState([]);
  const [isAddingRound, setIsAddingRound] = useState(false);
  const [editingId, setEditingId] = useState(null); 

  const [hasCalculated, setHasCalculated] = useState(false);
  const [reflection, setReflection] = useState('');
  const [nextAction, setNextAction] = useState('');

  const [diceSteps, setDiceSteps] = useState('');
  const [cardId, setCardId] = useState('');
  const [scoreDice, setScoreDice] = useState('');
  const [ffDice, setFfDice] = useState('');
  const [msgChoice, setMsgChoice] = useState('solo');

  useEffect(() => {
    if (amIPlaying) {
      const fetchMyData = async () => {
        try {
          const snap = await getDoc(doc(db, 'game_rooms', activeGameRoom.id, 'player_records', user.uid));
          if (snap.exists()) {
            const data = snap.data();
            if (data.setup) setSetup(data.setup);
            if (data.rounds) setRounds(data.rounds);
            if (data.summary) {
              setActiveRound(data.summary.activeRound || 1);
              setHasCalculated(data.summary.hasCalculated || false);
              setReflection(data.summary.reflection || '');
              setNextAction(data.summary.nextAction || '');
            }
          }
        } catch (error) { console.error("讀取紀錄失敗:", error); }
        finally { setDataLoaded(true); }
      };
      fetchMyData();
    }
  }, [amIPlaying, activeGameRoom.id, user.uid]);

  const handleEndGame = async () => {
    if (!window.confirm("確定要強制結束這場遊戲嗎？所有玩家將無法再新增分數。")) return;
    try { await updateDoc(doc(db, 'game_rooms', activeGameRoom.id), { status: 'ended' }); } 
    catch (e) { alert("結束遊戲失敗！"); }
  };

  // 🌟 核心 KIN 運算引擎升級：完美計算每次的 Base = 上一步KIN + 上一步快進
  const calculatedRounds = [];
  const colorScores = { red: 0, white: 0, blue: 0, yellow: 0, green: 0 };

  [1, 2, 3].forEach(rNum => {
    const rFootprints = rounds.filter(f => f.roundNum === rNum);
    const startKin = parseInt(setup[`r${rNum}`].startKin, 10) || 0;
    
    rFootprints.forEach((f, i) => {
      const prev = i > 0 ? calculatedRounds[calculatedRounds.length - 1] : null;
      const base = prev ? prev.currentKin + (prev.fastForward || 0) : startKin;
      const dSteps = parseInt(f.diceSteps) || 0;
      
      let k = (base + dSteps) % 260;
      const calcKin = k === 0 ? 260 : k;
      
      calculatedRounds.push({ ...f, currentKin: calcKin });
      if (colorScores[f.color] !== undefined) colorScores[f.color] += (f.score || 0);
    });
  });

  const finalScores = {
    red: Math.max(0, colorScores.red) * 10,
    white: Math.max(0, colorScores.white) * 10,
    blue: Math.max(0, colorScores.blue) * 10,
    yellow: Math.max(0, colorScores.yellow) * 10,
    green: Math.max(0, colorScores.green) * 10,
  };
  const totalFrequency = finalScores.red + finalScores.white + finalScores.blue + finalScores.yellow + finalScores.green;
  const currentStage = frequencyStages.find(s => totalFrequency <= s.max) || frequencyStages[4];

  // 🌟 預覽 KIN 引擎升級：即使沒輸入骰子(0步)，也會先加上一步的「快進」！
  let previewKin = null;
  if (setup[`r${activeRound}`]?.startKin) {
    const startKin = parseInt(setup[`r${activeRound}`].startKin, 10);
    const dSteps = parseInt(diceSteps) || 0;
    const rFootprints = calculatedRounds.filter(r => r.roundNum === activeRound);
    let prevFootprint = editingId ? rFootprints[rFootprints.findIndex(f => f.id === editingId) - 1] : rFootprints[rFootprints.length - 1];
    
    const base = prevFootprint ? prevFootprint.currentKin + (prevFootprint.fastForward || 0) : startKin;
    let k = (base + dSteps) % 260;
    previewKin = k === 0 ? 260 : k;
  }

  const saveToCloud = async (isManualAction = false) => {
    if (!amIPlaying || !dataLoaded) return;
    try {
      const recordRef = doc(db, 'game_rooms', activeGameRoom.id, 'player_records', user.uid);
      const currentKinValue = calculatedRounds.length > 0 ? calculatedRounds[calculatedRounds.length - 1].currentKin : (setup[`r${activeRound}`]?.startKin || '尚未設定');
      
      await setDoc(recordRef, {
        setup, rounds, 
        summary: { activeRound, currentKin: currentKinValue, totalScore: totalFrequency, hasCalculated, reflection, nextAction }, 
        updatedAt: Date.now()
      }, { merge: true });
      
      if (isManualAction) alert("💾 紀錄與反思已成功封存同步至雲端！\n您可以隨時在「玩家列表」中檢視。");
    } catch (e) {
      if (isManualAction) alert("存檔失敗：" + e.message);
    }
  };

  useEffect(() => {
    if (amIPlaying && dataLoaded) {
      const timeout = setTimeout(() => { saveToCloud(false); }, 800); 
      return () => clearTimeout(timeout);
    }
  }, [setup, rounds, activeRound, hasCalculated, reflection, nextAction, amIPlaying, dataLoaded, activeGameRoom.id, user.uid, totalFrequency]);

  const handleEditFootprint = (footprint) => {
    setIsAddingRound(true); setEditingId(footprint.id);
    setDiceSteps(footprint.diceSteps === 0 ? '' : footprint.diceSteps);
    const raw = footprint.rawInput || {};
    setCardId(raw.cardId || ''); setScoreDice(raw.scoreDice || '');
    setFfDice(raw.ffDice || ''); setMsgChoice(raw.msgChoice || 'solo');
  };

  const handleAddFootprint = () => {
    if (!previewKin) return alert(`請先填寫 ROUND ${activeRound} 的「起始 KIN」！`);
    const card = cardsData.find(c => c[0] === cardId);
    if (!card) return alert('請輸入正確的卡牌編號！');

    const cText = card[1], cColorStr = card[3], cType = card[4];
    let score = 0, fastForward = 0, detail = `卡牌 ${cardId}`; 

    if (cType === '奇蹟顯化') { score = 10; fastForward = (parseInt(ffDice) || 0) * 10; detail += ` | 快進 ${fastForward}`; } 
    else if (cType === '成就顯化') { score = 5; fastForward = (parseInt(ffDice) || 0) * 5; detail += ` | 快進 ${fastForward}`; } 
    else if (cType === '靈魂拷問') { score = parseInt(scoreDice) || 0; fastForward = (parseInt(ffDice) || 0) * 1; detail += ` | 骰分 ${score} | 快進 ${fastForward}`; } 
    else if (cType === '宇宙訊息') { score = msgChoice === 'benefactor' ? 10 : 5; detail += ` | ${msgChoice === 'benefactor' ? '貴人(+10)' : msgChoice === 'solo' ? '獨享(+5)' : '受贈(+5)'}`; } 
    else if (cType === '人生練習題') { score = -5; } 
    else if (cType === '天賦喚醒力') { score = 5; } 
    else if (cType === '發揮力量' || cType === '知與行') { score = parseInt(scoreDice) || 0; detail += ` | 骰分 ${score}`; }

    const colorMap = { '紅': 'red', '白': 'white', '藍': 'blue', '黃': 'yellow', '綠': 'green' };
    const colorId = colorMap[cColorStr] || 'red';

    const footprintData = { diceSteps: parseInt(diceSteps) || 0, fastForward, color: colorId, colorName: cardColors.find(c => c.id === colorId)?.name || cColorStr, cardType: cType, score, detail, rawInput: { cardId, scoreDice, ffDice, msgChoice } };

    if (editingId) setRounds(rounds.map(r => r.id === editingId ? { ...r, ...footprintData } : r));
    else setRounds([...rounds, { id: Date.now(), roundNum: activeRound, ...footprintData }]);

    setIsAddingRound(false); setEditingId(null);
    setDiceSteps(''); setCardId(''); setScoreDice(''); setFfDice(''); setMsgChoice('solo');
  };

  const removeFootprint = (id) => setRounds(rounds.filter(r => r.id !== id));

  const blockStyle = { backgroundColor: '#fff', borderRadius: '16px', padding: '15px', marginBottom: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.04)' };
  const compactInput = { width: '100%', minWidth: 0, padding: '6px 2px', borderRadius: '6px', border: '1px solid #f8bbd0', boxSizing: 'border-box', fontSize: '13px', textAlign: 'center' };
  const inputStyle = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #f8bbd0', boxSizing: 'border-box', marginTop: '4px' };
  const labelStyle = { fontSize: '11px', color: '#888', fontWeight: 'bold' };

  if (!dataLoaded) return <div style={{ textAlign: 'center', padding: '20px', color: '#d81b60' }}>讀取遊戲紀錄中...</div>;

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <button onClick={onBack} style={{ background: '#f1f5f9', border: 'none', padding: '6px 12px', borderRadius: '8px', fontWeight: 'bold', color: '#64748b', cursor: 'pointer' }}>返回</button>
        {isHost && activeGameRoom.status !== 'ended' && (
          <button onClick={handleEndGame} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>強制結束遊戲</button>
        )}
      </div>

      {isHost && isHostPlaying && (
        <div style={{ display: 'flex', width: '100%', marginBottom: '15px', backgroundColor: '#fff', borderRadius: '12px', padding: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <button onClick={() => setActiveTab('my_game')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: activeTab === 'my_game' ? '#ffebee' : 'transparent', color: activeTab === 'my_game' ? '#d81b60' : '#888', fontWeight: 'bold', cursor: 'pointer' }}>🎮 我的遊戲</button>
          <button onClick={() => setActiveTab('player_list')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: activeTab === 'player_list' ? '#e3f2fd' : 'transparent', color: activeTab === 'player_list' ? '#1976d2' : '#888', fontWeight: 'bold', cursor: 'pointer' }}>👥 玩家列表</button>
        </div>
      )}

      {activeTab === 'player_list' ? ( <PlayerListView activeGameRoom={activeGameRoom} /> ) : (
      <>
        <div style={blockStyle}>
          <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px', fontWeight: 'bold' }}>玩家資訊</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', color: '#333' }}>
            <div style={{ display: 'flex' }}><div style={{ flex: 1 }}><span style={{color:'#888'}}>姓名：</span>{myData.name}</div><div style={{ flex: 1 }}><span style={{color:'#888'}}>生日：</span>{myData.date}</div></div>
            <div><span style={{color:'#888'}}>印記：</span>{fullKinName}</div>
            <div style={{ display: 'flex' }}><div style={{ flex: 1 }}><span style={{color:'#888'}}>波符：</span>{myData.wavespell}</div><div style={{ flex: 1 }}><span style={{color:'#888'}}>家族：</span>{myData.earthFamily}</div></div>
          </div>
        </div>

        <div style={blockStyle}>
          <div style={{ fontSize: '14px', color: '#3949ab', marginBottom: '10px', fontWeight: 'bold' }}>✍️ 填寫印記設定 (由玩家輸入)</div>
          <div style={{ display: 'flex', gap: '6px', fontSize: '11px', color: '#888', textAlign: 'center', marginBottom: '6px', paddingLeft: '46px' }}>
            <div style={{ flex: 1 }}>起始 Age</div><div style={{ flex: 1 }}>起始 KIN</div><div style={{ width: '8px' }}></div><div style={{ flex: 1 }}>流年 Age</div><div style={{ flex: 1 }}>流年 KIN</div>
          </div>
          {[1, 2, 3].map(r => (
            <div key={`r${r}`} style={{ display: 'flex', gap: '6px', marginBottom: '8px', alignItems: 'center' }}>
              <div style={{ width: '40px', flexShrink: 0, textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#d81b60' }}>R {r}</div>
              <input type="text" value={setup[`r${r}`].startAge} onChange={(e)=>handleSetupChange(`r${r}`, 'startAge', e.target.value)} style={{...compactInput, flex: 1}} placeholder="Age" />
              <input type="number" value={setup[`r${r}`].startKin} onChange={(e)=>handleSetupChange(`r${r}`, 'startKin', e.target.value)} style={{...compactInput, flex: 1}} placeholder="KIN" />
              <div style={{ width: '8px', flexShrink: 0, textAlign: 'center', color: '#ccc', fontSize: '11px' }}>|</div>
              <input type="text" value={setup[`r${r}`].yearAge} onChange={(e)=>handleSetupChange(`r${r}`, 'yearAge', e.target.value)} style={{...compactInput, flex: 1}} placeholder="Age" />
              <input type="number" value={setup[`r${r}`].yearKin} onChange={(e)=>handleSetupChange(`r${r}`, 'yearKin', e.target.value)} style={{...compactInput, flex: 1}} placeholder="KIN" />
            </div>
          ))}
          <div style={{ display: 'flex', gap: '6px', marginTop: '6px', paddingTop: '8px', borderTop: '1px dashed #eee', alignItems: 'center' }}>
            <div style={{ width: '40px', flexShrink: 0, textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#d81b60' }}>END</div>
            <input type="text" value={setup.end.age} onChange={(e)=>handleSetupChange('end', 'age', e.target.value)} style={{...compactInput, flex: 1}} placeholder="Age" />
            <input type="number" value={setup.end.kin} onChange={(e)=>handleSetupChange('end', 'kin', e.target.value)} style={{...compactInput, flex: 1}} placeholder="KIN" />
            <div style={{ width: '8px', flexShrink: 0 }}></div><div style={{ flex: 1 }}></div><div style={{ flex: 1 }}></div>
          </div>
        </div>

        <div style={blockStyle}>
          <div style={{ fontSize: '15px', color: '#333', fontWeight: 'bold', marginBottom: '10px' }}>🐾 旅程足跡</div>
          {[1, 2, 3].map(roundNum => {
            if (roundNum > activeRound) return null; 
            const roundFootprints = calculatedRounds.filter(r => r.roundNum === roundNum);
            return (
              <div key={`footprint-r${roundNum}`} style={{ marginBottom: '20px', background: '#fafafa', padding: '10px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#3949ab', marginBottom: '10px' }}>ROUND {roundNum}</div>
                {roundFootprints.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
                    {roundFootprints.map((r, i) => (
                      <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '10px', borderRadius: '8px', borderLeft: `4px solid ${cardColors.find(c=>c.id===r.color)?.hex}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '11px', color: '#888' }}>足跡 {i+1} | 骰: {r.diceSteps} | 前進: {r.fastForward}</span>
                          <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#333' }}>{r.colorName?.split(' ')[0]} {r.cardType || '牌卡'} <span style={{color: '#d81b60'}}>當前 KIN {r.currentKin}</span></span>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>{r.detail}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontWeight: 'bold', color: r.score >= 0 ? '#22c55e' : '#ef4444', marginRight: '4px' }}>{r.score >= 0 ? '+' : ''}{r.score}分</span>
                          {activeGameRoom.status !== 'ended' && (
                            <><button onClick={() => handleEditFootprint(r)} style={{ background: '#f1f5f9', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '14px', padding: '6px', borderRadius: '6px' }}>✏️</button><button onClick={() => removeFootprint(r.id)} style={{ background: '#fee2e2', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px', padding: '6px', borderRadius: '6px' }}>✖</button></>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {activeRound === roundNum && activeGameRoom.status !== 'ended' && !hasCalculated && (
                  <div style={{ marginTop: '10px' }}>
                    {!isAddingRound ? (
                      <button onClick={() => setIsAddingRound(true)} style={{ width: '100%', background: '#fce4ec', color: '#d81b60', border: '1px dashed #d81b60', padding: '8px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>+ 新增足跡</button>
                    ) : (
                      <div style={{ backgroundColor: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #f8bbd0' }}>
                        <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#d81b60', marginBottom: '10px', textAlign: 'center' }}>{editingId ? '✏️ 修改足跡設定' : '➕ 新增足跡設定'}</div>
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}><div style={{ flex: 1 }}><span style={labelStyle}>骰子步數</span><input type="number" placeholder="若無請留空" value={diceSteps} onChange={(e)=>setDiceSteps(e.target.value)} style={inputStyle} /></div></div>
                        <div style={{ background: '#f3e5f5', padding: '8px', borderRadius: '6px', textAlign: 'center', marginBottom: '12px', border: '1px solid #ce93d8' }}><span style={{ fontSize: '12px', color: '#8e24aa', fontWeight: 'bold' }}>此步當前印記預覽：</span>{previewKin ? ( <span style={{ fontSize: '14px', color: '#4a148c', fontWeight: '900', marginLeft: '5px' }}>KIN {previewKin}</span> ) : ( <span style={{ fontSize: '12px', color: '#ef4444', marginLeft: '5px' }}>⚠️ 請先填寫 ROUND {activeRound} 起始 KIN</span> )}</div>
                        <div style={{ marginBottom: '10px' }}><span style={labelStyle}>卡牌編號</span><input type="text" placeholder="例如：515" value={cardId} onChange={(e)=>setCardId(e.target.value)} style={inputStyle} /></div>
                        {cardId && (() => {
                          const card = cardsData.find(c => c[0] === cardId);
                          if (!card) return <div style={{ fontSize: '12px', color: '#ef4444', marginBottom: '10px' }}>找不到此卡牌編號，請重新確認。</div>;
                          const cText = card[1], cImg = card[2], cColorStr = card[3], cType = card[4];
                          const colorMap = { '紅': '#ef4444', '白': '#94a3b8', '藍': '#3b82f6', '黃': '#eab308', '綠': '#22c55e' };
                          const hex = colorMap[cColorStr] || '#ccc';
                          return (
                            <div style={{ background: '#fafafa', padding: '12px', borderRadius: '8px', border: `2px solid ${hex}`, marginBottom: '15px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>{getCardIcon(cImg) && <img src={getCardIcon(cImg)} alt="icon" style={{ height: '30px', objectFit: 'contain' }} />}<div><span style={{ fontSize: '11px', background: hex, color: '#fff', padding: '2px 6px', borderRadius: '4px', marginRight: '6px' }}>{cColorStr}色</span><span style={{ fontSize: '12px', fontWeight: 'bold', color: '#333' }}>{cType}</span></div></div>
                              <div style={{ fontSize: '13px', color: '#555', marginBottom: '15px', lineHeight: '1.4', textAlign: 'justify' }}>{cText}</div>
                              {['發揮力量', '知與行', '靈魂拷問'].includes(cType) && (<div style={{ marginBottom: '10px' }}><span style={labelStyle}>🎯 卡牌得分骰子 (請輸入數字)</span><input type="number" min="1" max="6" value={scoreDice} onChange={e=>setScoreDice(e.target.value)} style={inputStyle} /></div>)}
                              {['奇蹟顯化', '成就顯化', '靈魂拷問'].includes(cType) && (<div style={{ marginBottom: '10px', background: '#e0f2fe', padding: '8px', borderRadius: '6px' }}><span style={labelStyle}>🚀 快速前進骰子 (請輸入數字)</span><input type="number" min="1" max="6" value={ffDice} onChange={e=>setFfDice(e.target.value)} style={{...inputStyle, background: '#fff'}} /><div style={{ fontSize: '11px', color: '#0284c7', marginTop: '6px', fontWeight: 'bold' }}>⚡ 將額外快進 { (parseInt(ffDice)||0) * (cType==='奇蹟顯化'?10 : cType==='成就顯化'?5 : 1) } 步</div></div>)}
                              {cType === '宇宙訊息' && (<div style={{ marginBottom: '10px' }}><span style={labelStyle}>🌟 宇宙訊息選擇</span><select value={msgChoice} onChange={e=>setMsgChoice(e.target.value)} style={inputStyle}><option value="solo">獨享 (+5分)</option><option value="benefactor">貴人 (+10分)</option><option value="gifted">受贈 (+5分)</option></select></div>)}
                              {['人生練習題'].includes(cType) && <div style={{ fontSize: '12px', color: '#ef4444', fontWeight: 'bold' }}>⚠️ 系統將自動扣 5 分</div>}{['天賦喚醒力', '成就顯化'].includes(cType) && <div style={{ fontSize: '12px', color: '#22c55e', fontWeight: 'bold' }}>✨ 系統將自動加 5 分</div>}{['奇蹟顯化'].includes(cType) && <div style={{ fontSize: '12px', color: '#22c55e', fontWeight: 'bold' }}>🎉 系統將自動加 10 分</div>}
                            </div>
                          );
                        })()}
                        <div style={{ display: 'flex', gap: '10px' }}><button onClick={() => { setIsAddingRound(false); setEditingId(null); }} style={{ flex: 1, padding: '10px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>取消</button><button onClick={handleAddFootprint} style={{ flex: 2, padding: '10px', background: '#3949ab', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>確認送出</button></div>
                      </div>
                    )}
                  </div>
                )}
                {activeRound === roundNum && activeRound < 3 && !isAddingRound && activeGameRoom.status !== 'ended' && !hasCalculated && (
                  <button onClick={() => setActiveRound(activeRound + 1)} style={{ width: '100%', marginTop: '15px', padding: '10px', background: '#e0f2fe', color: '#0284c7', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>進入下一回合 (ROUND {activeRound + 1}) ⬇️</button>
                )}
              </div>
            );
          })}
        </div>

        {/* 🌟 核心：意識頻率結算區塊 */}
        {!hasCalculated ? (
          <button onClick={() => setHasCalculated(true)} style={{ width: '100%', padding: '15px', background: 'linear-gradient(135deg, #ab47bc 0%, #7b1fa2 100%)', color: '#fff', border: 'none', borderRadius: '16px', fontWeight: 'bold', fontSize: '16px', marginBottom: '20px', boxShadow: '0 4px 15px rgba(171, 71, 188, 0.4)', cursor: 'pointer' }}>
            ✨ 結算本場意識頻率
          </button>
        ) : (
          <div style={{...blockStyle, backgroundColor: '#f3e5f5', border: '1px solid #ce93d8', animation: 'fadeIn 0.5s' }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#6a1b9a', textAlign: 'center' }}>📊 意識頻率結算報告</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '5px', textAlign: 'center', marginBottom: '15px' }}>
               {[ { id: 'red', label: '🔴 紅', hex: '#ef4444' }, { id: 'white', label: '⚪ 白', hex: '#94a3b8' }, { id: 'blue', label: '🔵 藍', hex: '#3b82f6' }, { id: 'yellow', label: '🟡 黃', hex: '#eab308' }, { id: 'green', label: '🟢 綠', hex: '#22c55e' } ].map(c => (
                 <div key={c.id} style={{ background: '#fff', padding: '8px 0', borderRadius: '8px', border: `1px solid ${c.hex}` }}>
                   <div style={{ fontSize: '11px', color: c.hex, fontWeight: 'bold' }}>{c.label}</div>
                   <div style={{ fontSize: '18px', fontWeight: '900', color: c.hex }}>{colorScores[c.id]} 分</div>
                   <div style={{ fontSize: '10px', color: '#888', marginTop: '2px' }}>頻率 {finalScores[c.id]}</div>
                 </div>
               ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', fontWeight: 'bold', color: '#4a148c' }}>
              <span>總頻率: {totalFrequency}</span><span>{currentStage.name}</span>
            </div>

            <div style={{ width: '100%', height: '24px', borderRadius: '12px', overflow: 'hidden', display: 'flex', backgroundColor: '#e2e8f0', marginBottom: '10px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)' }}>
               {totalFrequency === 0 ? (
                 <div style={{ width: '100%', background: '#ccc', textAlign: 'center', color: '#fff', fontSize: '10px', lineHeight: '24px' }}>無頻率產生</div>
               ) : (
                 <>
                   <div style={{ width: `${(finalScores.red / totalFrequency) * 100}%`, backgroundColor: '#ef4444', transition: 'width 1s' }}></div>
                   <div style={{ width: `${(finalScores.white / totalFrequency) * 100}%`, backgroundColor: '#94a3b8', transition: 'width 1s' }}></div>
                   <div style={{ width: `${(finalScores.blue / totalFrequency) * 100}%`, backgroundColor: '#3b82f6', transition: 'width 1s' }}></div>
                   <div style={{ width: `${(finalScores.yellow / totalFrequency) * 100}%`, backgroundColor: '#eab308', transition: 'width 1s' }}></div>
                   <div style={{ width: `${(finalScores.green / totalFrequency) * 100}%`, backgroundColor: '#22c55e', transition: 'width 1s' }}></div>
                 </>
               )}
            </div>
            
            <div style={{ padding: '12px', backgroundColor: '#fff', borderRadius: '10px', fontSize: '13px', color: '#333', textAlign: 'center', lineHeight: '1.5', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              {currentStage.desc}
            </div>

            <div style={{ marginTop: '20px' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#6a1b9a' }}>🦋 看見的重複模式或課題</label>
              <textarea rows="3" placeholder="在這次旅程中，我發現..." value={reflection} onChange={(e)=>setReflection(e.target.value)} style={{...inputStyle, resize: 'none', marginBottom: '10px'}} />
              
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#6a1b9a' }}>🔥 下一步的突破行動宣告</label>
              <textarea rows="2" placeholder="接下來，我決定..." value={nextAction} onChange={(e)=>setNextAction(e.target.value)} style={{...inputStyle, resize: 'none'}} />
            </div>
            
            {/* 🌟 真正的存檔按鈕：點擊後強制執行 saveToCloud(true) */}
            <button onClick={() => saveToCloud(true)} style={{ width: '100%', padding: '14px', background: '#26a69a', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', marginTop: '15px', fontSize: '15px', boxShadow: '0 4px 10px rgba(38, 166, 154, 0.3)' }}>
              💾 封存戰報與反思
            </button>
          </div>
        )}
      </>
      )}
    </div>
  );
}

function PlayerListView({ activeGameRoom }) {
  const [allRecords, setAllRecords] = useState({});
  const [viewingPlayerId, setViewingPlayerId] = useState(null); 

  useEffect(() => {
    const q = query(collection(db, 'game_rooms', activeGameRoom.id, 'player_records'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = {};
      snap.forEach(doc => { data[doc.id] = doc.data(); });
      setAllRecords(data);
    });
    return () => unsubscribe();
  }, [activeGameRoom.id]);

  if (viewingPlayerId) {
    const targetPlayer = activeGameRoom.players.find(p => p.uid === viewingPlayerId);
    const targetRecord = allRecords[viewingPlayerId];
    return <ReadOnlyPlayerRecord player={targetPlayer} record={targetRecord} onBack={() => setViewingPlayerId(null)} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <h3 style={{ color: '#1976d2', margin: '0 0 5px 0', fontSize: '16px', textAlign: 'center' }}>👥 戰況即時監控板</h3>
      <p style={{ fontSize: '12px', color: '#888', textAlign: 'center', marginTop: '-5px', marginBottom: '10px' }}>點擊玩家卡片可查看詳細紀錄</p>
      
      {activeGameRoom.players.map(p => {
        const rec = allRecords[p.uid];
        const summary = rec?.summary || { activeRound: 1, currentKin: '未開始', totalScore: 0 };
        const isHostTag = p.isHost ? <span style={{ fontSize: '10px', background: '#ffc107', padding: '2px 6px', borderRadius: '10px', marginLeft: '5px', color: '#333' }}>桌長</span> : null;
        const statusBadge = summary.hasCalculated ? <span style={{ fontSize: '10px', background: '#ce93d8', color: '#fff', padding: '2px 6px', borderRadius: '10px' }}>已結算</span> : <span style={{ fontSize: '10px', background: '#22c55e', color: '#fff', padding: '2px 6px', borderRadius: '10px' }}>進行中</span>;

        return (
          <div key={p.uid} onClick={() => setViewingPlayerId(p.uid)} style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', borderLeft: '4px solid #3b82f6', cursor: 'pointer', transition: 'transform 0.1s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#333' }}>{p.name} {isHostTag}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>{statusBadge}<span style={{ fontSize: '14px', color: '#1976d2' }}>🔍</span></div>
            </div>
            <div style={{ display: 'flex', background: '#f8f9fa', borderRadius: '8px', padding: '10px', gap: '10px', textAlign: 'center' }}>
              <div style={{ flex: 1 }}><div style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>當前 KIN</div><div style={{ fontSize: '14px', fontWeight: 'bold', color: '#d81b60' }}>{summary.currentKin}</div></div>
              <div style={{ width: '1px', background: '#e2e8f0' }}></div>
              <div style={{ flex: 1 }}><div style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>{summary.hasCalculated ? '總頻率' : '獲得總分'}</div><div style={{ fontSize: '14px', fontWeight: 'bold', color: summary.hasCalculated ? '#6a1b9a' : '#22c55e' }}>{summary.totalScore}</div></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ReadOnlyPlayerRecord({ player, record, onBack }) {
  const setup = record?.setup || { r1: {}, r2: {}, r3: {}, end: {} };
  const rounds = record?.rounds || [];
  const summary = record?.summary || {};
  
  let fullKinName = `KIN ${player.kin || '未知'}`;
  if (player.kin) {
    const kNum = parseInt(player.kin, 10);
    if (!isNaN(kNum)) {
      const tNum = ((kNum - 1) % 13) + 1;
      const mIdx = kNum % 20;
      fullKinName = `KIN ${kNum} ${toneNames[tNum - 1] || ''}的${seals[mIdx] ? seals[mIdx].name : ''}`;
    }
  }

  const calculatedRounds = [];
  const colorScores = { red: 0, white: 0, blue: 0, yellow: 0, green: 0 };
  
  [1, 2, 3].forEach(rNum => {
    const rFootprints = rounds.filter(f => f.roundNum === rNum);
    const startKin = parseInt(setup[`r${rNum}`]?.startKin, 10) || 0;
    rFootprints.forEach((f, i) => {
      const prev = i > 0 ? calculatedRounds[calculatedRounds.length - 1] : null;
      const base = prev ? prev.currentKin + (prev.fastForward || 0) : startKin;
      const dSteps = parseInt(f.diceSteps) || 0;
      let k = (base + dSteps) % 260;
      const calcKin = k === 0 ? 260 : k;
      calculatedRounds.push({ ...f, currentKin: calcKin });
      if (colorScores[f.color] !== undefined) colorScores[f.color] += (f.score || 0);
    });
  });

  const finalScores = {
    red: Math.max(0, colorScores.red) * 10, white: Math.max(0, colorScores.white) * 10,
    blue: Math.max(0, colorScores.blue) * 10, yellow: Math.max(0, colorScores.yellow) * 10, green: Math.max(0, colorScores.green) * 10,
  };
  const totalFrequency = finalScores.red + finalScores.white + finalScores.blue + finalScores.yellow + finalScores.green;
  const currentStage = frequencyStages.find(s => totalFrequency <= s.max) || frequencyStages[4];

  const blockStyle = { backgroundColor: '#fff', borderRadius: '16px', padding: '15px', marginBottom: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.04)' };
  const readOnlyCell = { flex: 1, padding: '6px 2px', background: '#f8f9fa', borderRadius: '6px', fontSize: '13px', textAlign: 'center', color: '#333', minHeight: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center' };

  return (
    <div style={{ width: '100%', animation: 'fadeIn 0.3s' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', background: '#e3f2fd', padding: '10px 15px', borderRadius: '12px' }}>
         <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#1976d2' }}>{player.name} 的詳細紀錄</span>
         <button onClick={onBack} style={{ background: '#1976d2', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>返回</button>
      </div>

      {summary.hasCalculated && (
        <div style={{...blockStyle, backgroundColor: '#f3e5f5', border: '1px solid #ce93d8'}}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '15px', color: '#6a1b9a', textAlign: 'center' }}>📊 玩家已完成結算</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '12px', fontWeight: 'bold', color: '#4a148c' }}>
            <span>總頻率: {totalFrequency}</span><span>{currentStage.name}</span>
          </div>
          <div style={{ width: '100%', height: '16px', borderRadius: '8px', overflow: 'hidden', display: 'flex', backgroundColor: '#e2e8f0', marginBottom: '15px' }}>
             {totalFrequency > 0 && (
               <><div style={{ width: `${(finalScores.red/totalFrequency)*100}%`, background: '#ef4444' }}></div><div style={{ width: `${(finalScores.white/totalFrequency)*100}%`, background: '#94a3b8' }}></div><div style={{ width: `${(finalScores.blue/totalFrequency)*100}%`, background: '#3b82f6' }}></div><div style={{ width: `${(finalScores.yellow/totalFrequency)*100}%`, background: '#eab308' }}></div><div style={{ width: `${(finalScores.green/totalFrequency)*100}%`, background: '#22c55e' }}></div></>
             )}
          </div>
          {summary.reflection && <div style={{ background: '#fff', padding: '10px', borderRadius: '8px', marginBottom: '8px' }}><div style={{ fontSize: '11px', color: '#6a1b9a', fontWeight: 'bold' }}>看見的模式或課題：</div><div style={{ fontSize: '13px', color: '#333' }}>{summary.reflection}</div></div>}
          {summary.nextAction && <div style={{ background: '#fff', padding: '10px', borderRadius: '8px' }}><div style={{ fontSize: '11px', color: '#6a1b9a', fontWeight: 'bold' }}>突破行動宣告：</div><div style={{ fontSize: '13px', color: '#333' }}>{summary.nextAction}</div></div>}
        </div>
      )}

      <div style={blockStyle}>
        <div style={{ fontSize: '14px', color: '#3949ab', marginBottom: '10px', fontWeight: 'bold' }}>✍️ 印記設定</div>
        <div style={{ display: 'flex', gap: '6px', fontSize: '11px', color: '#888', textAlign: 'center', marginBottom: '6px', paddingLeft: '46px' }}>
          <div style={{ flex: 1 }}>起始 Age</div><div style={{ flex: 1 }}>起始 KIN</div><div style={{ width: '8px' }}></div><div style={{ flex: 1 }}>流年 Age</div><div style={{ flex: 1 }}>流年 KIN</div>
        </div>
        {[1, 2, 3].map(r => (
          <div key={`read-r${r}`} style={{ display: 'flex', gap: '6px', marginBottom: '8px', alignItems: 'center' }}>
            <div style={{ width: '40px', flexShrink: 0, textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#d81b60' }}>R {r}</div>
            <div style={readOnlyCell}>{setup[`r${r}`]?.startAge || '-'}</div><div style={readOnlyCell}>{setup[`r${r}`]?.startKin || '-'}</div><div style={{ width: '8px', flexShrink: 0, textAlign: 'center', color: '#ccc', fontSize: '11px' }}>|</div><div style={readOnlyCell}>{setup[`r${r}`]?.yearAge || '-'}</div><div style={readOnlyCell}>{setup[`r${r}`]?.yearKin || '-'}</div>
          </div>
        ))}
      </div>

      <div style={blockStyle}>
        <div style={{ fontSize: '15px', color: '#333', fontWeight: 'bold', marginBottom: '10px' }}>🐾 旅程足跡</div>
        {calculatedRounds.length === 0 ? <div style={{ color: '#888', fontSize: '13px', textAlign: 'center', padding: '10px' }}>尚無足跡</div> : (
          [1, 2, 3].map(roundNum => {
            const rFootprints = calculatedRounds.filter(r => r.roundNum === roundNum);
            if (rFootprints.length === 0) return null;
            return (
              <div key={`read-footprint-r${roundNum}`} style={{ marginBottom: '15px', background: '#fafafa', padding: '10px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#3949ab', marginBottom: '10px' }}>ROUND {roundNum}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {rFootprints.map((r, i) => (
                    <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '10px', borderRadius: '8px', borderLeft: `4px solid ${cardColors.find(c=>c.id===r.color)?.hex}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '11px', color: '#888' }}>足跡 {i+1} | 骰: {r.diceSteps} | 前進: {r.fastForward}</span>
                        <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#333' }}>{r.colorName?.split(' ')[0]} {r.cardType || '牌卡'} <span style={{color: '#d81b60'}}>當前 KIN {r.currentKin}</span></span>
                      </div>
                      <span style={{ fontWeight: 'bold', color: r.score >= 0 ? '#22c55e' : '#ef4444' }}>{r.score >= 0 ? '+' : ''}{r.score}分</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
