// src/BoardGameRecord.jsx
import React, { useState } from 'react';
import { db } from './firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { seals, toneNames } from './mayaEngine'; // 🌟 引入瑪雅引擎來組裝完整印記名稱

const cardColors = [
  { id: 'red', name: '🔴 未知探索', hex: '#ef4444' },
  { id: 'white', name: '⚪ 內觀梳理', hex: '#d1d5db' },
  { id: 'blue', name: '🔵 蛻變進擊', hex: '#3b82f6' },
  { id: 'yellow', name: '🟡 實踐成就', hex: '#eab308' },
  { id: 'green', name: '🟢 顯化矩陣', hex: '#22c55e' }
];

export default function BoardGameRecord({ user, activeGameRoom, onBack }) {
  const myData = activeGameRoom.players.find(p => p.uid === user.uid) || {};
  const isHost = activeGameRoom.hostId === user.uid;

  // 🌟 計算完整印記名稱 (例如：KIN 95 自我存在的藍鷹)
  let fullKinName = `KIN ${myData.kin || '未知'}`;
  if (myData.kin) {
    const kNum = parseInt(myData.kin, 10);
    if (!isNaN(kNum)) {
      const tNum = ((kNum - 1) % 13) + 1;
      const mIdx = kNum % 20;
      const tName = toneNames[tNum - 1] || '';
      const sName = seals[mIdx] ? seals[mIdx].name : '';
      fullKinName = `KIN ${kNum} ${tName}的${sName}`;
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

  const [diceSteps, setDiceSteps] = useState('');
  const [fastForward, setFastForward] = useState('');
  const [selectedColor, setSelectedColor] = useState('red');
  const [cardType, setCardType] = useState('direct'); 
  const [directScore, setDirectScore] = useState('');
  const [dice1, setDice1] = useState(1);
  const [dice2, setDice2] = useState(1);
  const [fixedType, setFixedType] = useState('5'); 

  const handleEndGame = async () => {
    if (!window.confirm("確定要強制結束這場遊戲嗎？所有玩家將無法再新增分數。")) return;
    try { await updateDoc(doc(db, 'game_rooms', activeGameRoom.id), { status: 'ended' }); } 
    catch (e) { alert("結束遊戲失敗！"); }
  };

  const calculatedRounds = [];
  [1, 2, 3].forEach(rNum => {
    const rFootprints = rounds.filter(f => f.roundNum === rNum);
    const startKin = parseInt(setup[`r${rNum}`].startKin, 10) || 0;

    rFootprints.forEach((f, i) => {
      let calcKin = 0;
      const dSteps = parseInt(f.diceSteps) || 0;
      if (dSteps === 0 && i > 0) {
        calcKin = calculatedRounds[calculatedRounds.length - 1].currentKin;
      } else {
        const base = i === 0 ? startKin : calculatedRounds[calculatedRounds.length - 1].currentKin + (calculatedRounds[calculatedRounds.length - 1].fastForward || 0);
        let k = (base + dSteps) % 260;
        calcKin = k === 0 ? 260 : k;
      }
      calculatedRounds.push({ ...f, currentKin: calcKin });
    });
  });

  let previewKin = null;
  if (setup[`r${activeRound}`]?.startKin) {
    const startKin = parseInt(setup[`r${activeRound}`].startKin, 10);
    const dSteps = parseInt(diceSteps) || 0;

    const rFootprints = calculatedRounds.filter(r => r.roundNum === activeRound);
    let prevFootprint = null;

    if (editingId) {
       const editIdx = rFootprints.findIndex(f => f.id === editingId);
       if (editIdx > 0) prevFootprint = rFootprints[editIdx - 1];
    } else {
       if (rFootprints.length > 0) prevFootprint = rFootprints[rFootprints.length - 1];
    }

    if (dSteps === 0 && prevFootprint) {
       previewKin = prevFootprint.currentKin;
    } else {
       const base = prevFootprint ? prevFootprint.currentKin + (prevFootprint.fastForward || 0) : startKin;
       let k = (base + dSteps) % 260;
       previewKin = k === 0 ? 260 : k;
    }
  }

  const handleEditFootprint = (footprint) => {
    setIsAddingRound(true);
    setEditingId(footprint.id);
    setDiceSteps(footprint.diceSteps === 0 ? '' : footprint.diceSteps);
    setFastForward(footprint.fastForward === 0 ? '' : footprint.fastForward);
    setSelectedColor(footprint.color);

    const raw = footprint.rawInput || {};
    setCardType(raw.cardType || 'direct');
    setDirectScore(raw.directScore || '');
    setDice1(raw.dice1 || 1);
    setDice2(raw.dice2 || 1);
    setFixedType(raw.fixedType || '5');
  };

  const handleAddFootprint = () => {
    if (!previewKin) return alert(`請先填寫 ROUND ${activeRound} 的「起始 KIN」！`);

    let score = 0; let detail = '';
    if (cardType === 'direct') { score = parseInt(directScore) || 0; detail = `直接計分: ${score}`; } 
    else if (cardType === 'power') {
      if (dice1 % 2 !== 0) { score = 5; detail = `發揮力量 (骰1:${dice1}) -> +5`; }
      else {
        if (dice2 % 2 !== 0) { score = -3; detail = `發揮力量 (骰1:${dice1}, 骰2:${dice2}) -> -3`; }
        else { score = -5; detail = `發揮力量 (骰1:${dice1}, 骰2:${dice2}) -> -5`; }
      }
    }
    else if (cardType === 'wisdom') {
      if (dice1 === 3 || dice1 === 4) { score = 0; detail = `語型 (骰:${dice1}) -> +0`; }
      else if (dice1 === 2 || dice1 === 5) { score = 3; detail = `語型 (骰:${dice1}) -> +3`; }
      else { score = 5; detail = `語型 (骰:${dice1}) -> +5`; }
    }
    else if (cardType === 'question') { score = parseInt(dice1) || 0; detail = `靈魂拷問 (骰:${dice1}) -> +${score}`; }
    else if (cardType === 'fixed') { score = parseInt(fixedType); detail = `特殊加分 -> +${score}`; }

    const footprintData = {
      diceSteps: parseInt(diceSteps) || 0,
      fastForward: parseInt(fastForward) || 0,
      color: selectedColor,
      colorName: cardColors.find(c => c.id === selectedColor).name,
      score, detail,
      rawInput: { cardType, directScore, dice1, dice2, fixedType }
    };

    if (editingId) {
      setRounds(rounds.map(r => r.id === editingId ? { ...r, ...footprintData } : r));
    } else {
      setRounds([...rounds, { id: Date.now(), roundNum: activeRound, ...footprintData }]);
    }

    setIsAddingRound(false);
    setEditingId(null);
    setDiceSteps(''); setFastForward(''); setDirectScore(''); setDice1(1); setDice2(1);
  };

  const removeFootprint = (id) => setRounds(rounds.filter(r => r.id !== id));

  // --- UI 樣式設定 ---
  const blockStyle = { backgroundColor: '#fff', borderRadius: '16px', padding: '15px', marginBottom: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.04)' };
  const compactInput = { width: '100%', minWidth: 0, padding: '6px 2px', borderRadius: '6px', border: '1px solid #f8bbd0', boxSizing: 'border-box', fontSize: '13px', textAlign: 'center' };
  const inputStyle = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #f8bbd0', boxSizing: 'border-box', marginTop: '4px' };
  const labelStyle = { fontSize: '11px', color: '#888', fontWeight: 'bold' };

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <button onClick={onBack} style={{ background: '#f1f5f9', border: 'none', padding: '6px 12px', borderRadius: '8px', fontWeight: 'bold', color: '#64748b', cursor: 'pointer' }}>返回</button>
        {isHost && activeGameRoom.status !== 'ended' && (
          <button onClick={handleEndGame} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>強制結束遊戲</button>
        )}
      </div>

      {/* 🌟 更新後的玩家資訊區塊 */}
      <div style={blockStyle}>
        <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px', fontWeight: 'bold' }}>玩家資訊</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', color: '#333' }}>
          <div style={{ display: 'flex' }}>
            <div style={{ flex: 1 }}><span style={{color:'#888'}}>姓名：</span>{myData.name}</div>
            <div style={{ flex: 1 }}><span style={{color:'#888'}}>生日：</span>{myData.date}</div>
          </div>
          <div><span style={{color:'#888'}}>印記：</span>{fullKinName}</div>
          <div style={{ display: 'flex' }}>
            <div style={{ flex: 1 }}><span style={{color:'#888'}}>波符：</span>{myData.wavespell}</div>
            <div style={{ flex: 1 }}><span style={{color:'#888'}}>家族：</span>{myData.earthFamily}</div>
          </div>
        </div>
      </div>

      <div style={blockStyle}>
        <div style={{ fontSize: '14px', color: '#3949ab', marginBottom: '10px', fontWeight: 'bold' }}>✍️ 填寫印記設定 (由玩家輸入)</div>

        <div style={{ display: 'flex', gap: '6px', fontSize: '11px', color: '#888', textAlign: 'center', marginBottom: '6px', paddingLeft: '46px' }}>
          <div style={{ flex: 1 }}>起始 Age</div>
          <div style={{ flex: 1 }}>起始 KIN</div>
          <div style={{ width: '8px' }}></div>
          <div style={{ flex: 1 }}>流年 Age</div>
          <div style={{ flex: 1 }}>流年 KIN</div>
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
          <div style={{ width: '8px', flexShrink: 0 }}></div>
          <div style={{ flex: 1 }}></div>
          <div style={{ flex: 1 }}></div>
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
                        <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#333' }}>{r.colorName} <span style={{color: '#d81b60'}}>當前 KIN {r.currentKin}</span></span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>{r.detail}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontWeight: 'bold', color: r.score >= 0 ? '#22c55e' : '#ef4444', marginRight: '4px' }}>{r.score >= 0 ? '+' : ''}{r.score}分</span>
                        <button onClick={() => handleEditFootprint(r)} style={{ background: '#f1f5f9', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '14px', padding: '6px', borderRadius: '6px' }}>✏️</button>
                        <button onClick={() => removeFootprint(r.id)} style={{ background: '#fee2e2', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px', padding: '6px', borderRadius: '6px' }}>✖</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeRound === roundNum && activeGameRoom.status !== 'ended' && (
                <div style={{ marginTop: '10px' }}>
                  {!isAddingRound ? (
                    <button onClick={() => setIsAddingRound(true)} style={{ width: '100%', background: '#fce4ec', color: '#d81b60', border: '1px dashed #d81b60', padding: '8px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>+ 新增足跡</button>
                  ) : (
                    <div style={{ backgroundColor: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #f8bbd0' }}>
                      <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#d81b60', marginBottom: '10px', textAlign: 'center' }}>
                        {editingId ? '✏️ 修改足跡設定' : '➕ 新增足跡設定'}
                      </div>

                      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                        <div style={{ flex: 1 }}><span style={labelStyle}>骰子步數</span><input type="number" placeholder="若無請留空" value={diceSteps} onChange={(e)=>setDiceSteps(e.target.value)} style={inputStyle} /></div>
                        <div style={{ flex: 1 }}><span style={labelStyle}>快速前進</span><input type="number" placeholder="若無請留空" value={fastForward} onChange={(e)=>setFastForward(e.target.value)} style={inputStyle} /></div>
                      </div>

                      <div style={{ background: '#f3e5f5', padding: '8px', borderRadius: '6px', textAlign: 'center', marginBottom: '12px', border: '1px solid #ce93d8' }}>
                        <span style={{ fontSize: '12px', color: '#8e24aa', fontWeight: 'bold' }}>此步當前印記預覽：</span>
                        {previewKin ? ( <span style={{ fontSize: '14px', color: '#4a148c', fontWeight: '900', marginLeft: '5px' }}>KIN {previewKin}</span> ) : ( <span style={{ fontSize: '12px', color: '#ef4444', marginLeft: '5px' }}>⚠️ 請先填寫 ROUND {activeRound} 起始 KIN</span> )}
                      </div>

                      <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
                        {cardColors.map(c => (
                          <button key={c.id} onClick={() => setSelectedColor(c.id)} style={{ flex: 1, padding: '6px 0', border: 'none', borderRadius: '4px', background: selectedColor === c.id ? c.hex : '#f1f5f9', color: selectedColor === c.id ? '#fff' : '#94a3b8', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>{c.name.split(' ')[0]}</button>
                        ))}
                      </div>

                      <select value={cardType} onChange={(e)=>setCardType(e.target.value)} style={{...inputStyle, marginBottom: '10px', marginTop: 0}}>
                        <option value="direct">✍️ 直接記分</option><option value="power">🎲 發揮力量</option>
                        <option value="wisdom">📖 智慧語型</option><option value="question">🗣️ 靈魂拷問</option>
                        <option value="fixed">✨ 特殊加分</option>
                      </select>

                      {cardType === 'direct' && <input type="number" placeholder="請輸入卡片分數" value={directScore} onChange={(e)=>setDirectScore(e.target.value)} style={{...inputStyle, marginTop: 0, marginBottom: '10px'}} />}
                      {cardType === 'power' && (
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                          <span style={labelStyle}>第1次骰:</span><input type="number" min="1" max="6" value={dice1} onChange={(e)=>setDice1(e.target.value)} style={{ width: '50px', padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }} />
                          {dice1 % 2 === 0 && (<><span style={{...labelStyle, color: '#d32f2f'}}>第2次骰:</span><input type="number" min="1" max="6" value={dice2} onChange={(e)=>setDice2(e.target.value)} style={{ width: '50px', padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }} /></>)}
                        </div>
                      )}
                      {(cardType === 'wisdom' || cardType === 'question') && (
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}><span style={labelStyle}>骰子點數:</span><input type="number" min="1" max="6" value={dice1} onChange={(e)=>setDice1(e.target.value)} style={{ width: '60px', padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }} /></div>
                      )}
                      {cardType === 'fixed' && (
                        <select value={fixedType} onChange={(e)=>setFixedType(e.target.value)} style={{...inputStyle, marginTop: 0, marginBottom: '10px'}}><option value="5">+5 分</option><option value="10">+10 分</option></select>
                      )}

                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => { setIsAddingRound(false); setEditingId(null); }} style={{ flex: 1, padding: '10px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>取消</button>
                        <button onClick={handleAddFootprint} style={{ flex: 2, padding: '10px', background: '#3949ab', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>確認送出</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeRound === roundNum && activeRound < 3 && !isAddingRound && activeGameRoom.status !== 'ended' && (
                <button onClick={() => setActiveRound(activeRound + 1)} style={{ width: '100%', marginTop: '15px', padding: '10px', background: '#e0f2fe', color: '#0284c7', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                  進入下一回合 (ROUND {activeRound + 1}) ⬇️
                </button>
              )}
            </div>
          );
        })}
      </div>

      <button onClick={() => alert("✅ 頻率計算建置中！敬請期待！")} style={{ width: '100%', padding: '15px', background: '#ab47bc', color: '#fff', border: 'none', borderRadius: '16px', fontWeight: 'bold', fontSize: '16px', marginBottom: '20px', boxShadow: '0 4px 15px rgba(171, 71, 188, 0.3)', cursor: 'pointer' }}>
        ✨ 結算本場意識頻率
      </button>

    </div>
  );
}