import React, { useState, useEffect, useRef } from 'react';
import { Theme, FONT } from './ui';
import { EXERCISE_REGISTRY } from './registry';

interface BodyFrame { [joint: string]: [number, number] | string; label: string; }

function lerp(a:number,b:number,t:number) { return a+(b-a)*t; }
function lerpPt(a:[number,number],b:[number,number],t:number):[number,number] { return [lerp(a[0],b[0],t), lerp(a[1],b[1],t)]; }
function interp(f1:BodyFrame, f2:BodyFrame, t:number): BodyFrame {
  const keys = Object.keys(f1).filter(k => k !== 'label');
  const result: BodyFrame = { label: t<0.5?f1.label:f2.label };
  for (const k of keys) result[k] = lerpPt(f1[k] as [number,number], f2[k] as [number,number], t);
  return result;
}

const ANIMATIONS: Record<string, { frames: BodyFrame[]; fps: number; needsBar?: boolean }> = {
  pullup: { fps:8, needsBar:true, frames:[
    { label:'Dead Hang', head:[50,8],neck:[50,13],shoulder_l:[38,18],shoulder_r:[62,18],elbow_l:[34,30],elbow_r:[66,30],hand_l:[32,12],hand_r:[68,12],hip:[50,50],hip_l:[44,50],hip_r:[56,50],knee_l:[43,68],knee_r:[57,68],foot_l:[41,88],foot_r:[59,88] },
    { label:'Pulling', head:[50,15],neck:[50,20],shoulder_l:[38,25],shoulder_r:[62,25],elbow_l:[36,28],elbow_r:[64,28],hand_l:[32,12],hand_r:[68,12],hip:[50,55],hip_l:[44,55],hip_r:[56,55],knee_l:[43,72],knee_r:[57,72],foot_l:[41,90],foot_r:[59,90] },
    { label:'Top', head:[50,20],neck:[50,25],shoulder_l:[38,28],shoulder_r:[62,28],elbow_l:[34,22],elbow_r:[66,22],hand_l:[32,12],hand_r:[68,12],hip:[50,58],hip_l:[44,58],hip_r:[56,58],knee_l:[43,74],knee_r:[57,74],foot_l:[41,92],foot_r:[59,92] },
  ]},
  pushup: { fps:8, frames:[
    { label:'Top', head:[15,30],neck:[20,33],shoulder_l:[25,35],shoulder_r:[25,35],elbow_l:[35,35],elbow_r:[35,35],hand_l:[45,40],hand_r:[45,40],hip:[60,35],hip_l:[62,35],hip_r:[58,35],knee_l:[75,40],knee_r:[75,40],foot_l:[88,45],foot_r:[88,45] },
    { label:'Bottom', head:[15,44],neck:[20,46],shoulder_l:[25,48],shoulder_r:[25,48],elbow_l:[30,52],elbow_r:[30,52],hand_l:[45,55],hand_r:[45,55],hip:[60,48],hip_l:[62,48],hip_r:[58,48],knee_l:[75,50],knee_r:[75,50],foot_l:[88,50],foot_r:[88,50] },
  ]},
  plank: { fps:4, frames:[ { label:'Hold', head:[12,35],neck:[17,37],shoulder_l:[22,38],shoulder_r:[22,38],elbow_l:[33,40],elbow_r:[33,40],hand_l:[44,42],hand_r:[44,42],hip:[60,38],hip_l:[62,38],hip_r:[58,38],knee_l:[75,40],knee_r:[75,40],foot_l:[88,44],foot_r:[88,44] } ] },
  hollow_hold: { fps:6, frames:[ { label:'Hold', head:[50,72],neck:[50,67],shoulder_l:[38,62],shoulder_r:[62,62],elbow_l:[28,55],elbow_r:[72,55],hand_l:[20,46],hand_r:[80,46],hip:[50,55],hip_l:[44,55],hip_r:[56,55],knee_l:[44,40],knee_r:[56,40],foot_l:[42,25],foot_r:[58,25] } ] },
  bodyweight_squat: { fps:8, frames:[
    { label:'Standing', head:[50,10],neck:[50,16],shoulder_l:[40,22],shoulder_r:[60,22],elbow_l:[38,35],elbow_r:[62,35],hand_l:[36,48],hand_r:[64,48],hip:[50,45],hip_l:[44,45],hip_r:[56,45],knee_l:[43,65],knee_r:[57,65],foot_l:[40,88],foot_r:[60,88] },
    { label:'Bottom', head:[46,28],neck:[46,34],shoulder_l:[36,40],shoulder_r:[56,40],elbow_l:[28,50],elbow_r:[56,50],hand_l:[22,58],hand_r:[60,58],hip:[50,56],hip_l:[41,58],hip_r:[59,58],knee_l:[34,72],knee_r:[60,72],foot_l:[32,88],foot_r:[62,88] },
  ]},
  wall_sit: { fps:3, frames:[ { label:'Hold', head:[50,15],neck:[50,21],shoulder_l:[38,27],shoulder_r:[62,27],elbow_l:[36,40],elbow_r:[64,40],hand_l:[36,53],hand_r:[64,53],hip:[50,50],hip_l:[42,50],hip_r:[58,50],knee_l:[30,68],knee_r:[70,68],foot_l:[25,88],foot_r:[75,88] } ] },
  dead_hang: { fps:3, needsBar:true, frames:[ { label:'Relaxed Hang', head:[50,8],neck:[50,14],shoulder_l:[36,20],shoulder_r:[64,20],elbow_l:[33,32],elbow_r:[67,32],hand_l:[31,12],hand_r:[69,12],hip:[50,52],hip_l:[44,52],hip_r:[56,52],knee_l:[43,70],knee_r:[57,70],foot_l:[41,90],foot_r:[59,90] } ] },
  hanging_leg_raise: { fps:8, needsBar:true, frames:[
    { label:'Dead Hang', head:[50,8],neck:[50,14],shoulder_l:[36,20],shoulder_r:[64,20],elbow_l:[33,32],elbow_r:[67,32],hand_l:[31,12],hand_r:[69,12],hip:[50,52],hip_l:[44,52],hip_r:[56,52],knee_l:[43,72],knee_r:[57,72],foot_l:[41,92],foot_r:[59,92] },
    { label:'Top', head:[50,8],neck:[50,14],shoulder_l:[36,20],shoulder_r:[64,20],elbow_l:[33,32],elbow_r:[67,32],hand_l:[31,12],hand_r:[69,12],hip:[50,52],hip_l:[44,52],hip_r:[56,52],knee_l:[44,44],knee_r:[56,44],foot_l:[42,36],foot_r:[58,36] },
  ]},
  burpee: { fps:10, frames:[
    { label:'Standing', head:[50,10],neck:[50,16],shoulder_l:[40,22],shoulder_r:[60,22],elbow_l:[38,35],elbow_r:[62,35],hand_l:[36,48],hand_r:[64,48],hip:[50,45],hip_l:[44,45],hip_r:[56,45],knee_l:[43,65],knee_r:[57,65],foot_l:[40,88],foot_r:[60,88] },
    { label:'Plank', head:[12,35],neck:[17,37],shoulder_l:[22,38],shoulder_r:[22,38],elbow_l:[33,40],elbow_r:[33,40],hand_l:[44,42],hand_r:[44,42],hip:[60,38],hip_l:[62,38],hip_r:[58,38],knee_l:[75,40],knee_r:[75,40],foot_l:[88,44],foot_r:[88,44] },
    { label:'Jump!', head:[50,5],neck:[50,11],shoulder_l:[38,17],shoulder_r:[62,17],elbow_l:[30,10],elbow_r:[70,10],hand_l:[22,4],hand_r:[78,4],hip:[50,42],hip_l:[44,44],hip_r:[56,44],knee_l:[44,60],knee_r:[56,60],foot_l:[42,78],foot_r:[58,78] },
  ]},
  pike_pushup: { fps:8, frames:[
    { label:'Inverted V', head:[50,55],neck:[50,50],shoulder_l:[38,44],shoulder_r:[62,44],elbow_l:[34,52],elbow_r:[66,52],hand_l:[30,60],hand_r:[70,60],hip:[50,30],hip_l:[47,30],hip_r:[53,30],knee_l:[42,50],knee_r:[58,50],foot_l:[36,72],foot_r:[64,72] },
    { label:'Bottom', head:[50,68],neck:[50,63],shoulder_l:[38,56],shoulder_r:[62,56],elbow_l:[36,60],elbow_r:[64,60],hand_l:[30,64],hand_r:[70,64],hip:[50,34],hip_l:[47,34],hip_r:[53,34],knee_l:[42,54],knee_r:[58,54],foot_l:[36,74],foot_r:[64,74] },
  ]},
};

const StickFigure: React.FC<{ frame: BodyFrame; color: string; barY?: number }> = ({ frame:f, color, barY }) => {
  const conn: [string,string][] = [['head','neck'],['neck','shoulder_l'],['neck','shoulder_r'],['shoulder_l','elbow_l'],['elbow_l','hand_l'],['shoulder_r','elbow_r'],['elbow_r','hand_r'],['neck','hip'],['hip','hip_l'],['hip','hip_r'],['hip_l','knee_l'],['knee_l','foot_l'],['hip_r','knee_r'],['knee_r','foot_r']];
  return (
    <g>
      {barY !== undefined && <><rect x="10" y={barY-2} width="80" height="4" rx="2" fill={color} opacity="0.4"/><line x1="20" y1={barY-2} x2="20" y2="0" stroke={color} strokeWidth="2" opacity="0.3"/><line x1="80" y1={barY-2} x2="80" y2="0" stroke={color} strokeWidth="2" opacity="0.3"/></>}
      {conn.map(([a,b]) => { const pa=f[a] as [number,number], pb=f[b] as [number,number]; return <line key={`${a}-${b}`} x1={pa[0]} y1={pa[1]} x2={pb[0]} y2={pb[1]} stroke={color} strokeWidth="2.5" strokeLinecap="round"/>; })}
      <circle cx={(f.head as [number,number])[0]} cy={(f.head as [number,number])[1]} r={5} fill="none" stroke={color} strokeWidth="2.5"/>
    </g>
  );
};

const Animation: React.FC<{ exerciseId: string; t: Theme }> = ({ exerciseId, t }) => {
  const anim = ANIMATIONS[exerciseId];
  const [idx, setIdx] = useState(0);
  const [subT, setSubT] = useState(0);
  const [playing, setPlaying] = useState(true);
  const rafRef = useRef<number>(0);
  const lastRef = useRef<number>(0);
  const fps = anim?.fps ?? 8;
  const frameDur = 1000/fps;

  useEffect(() => {
    if (!anim || !playing) return;
    function tick(now:number) {
      if (!lastRef.current) lastRef.current = now;
      const delta = now - lastRef.current;
      setSubT(Math.min(delta/frameDur,1));
      if (delta >= frameDur) { setIdx(i => (i+1) % anim.frames.length); lastRef.current = now; }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, idx, anim]);

  if (!anim) return <div style={{textAlign:'center',padding:24,color:t.txt2,fontSize:12}}>Animation coming soon for this exercise</div>;

  const cur = interp(anim.frames[idx], anim.frames[(idx+1)%anim.frames.length], subT);
  return (
    <div>
      <div style={{ background:t.surface2, borderRadius:12, overflow:'hidden', position:'relative', marginBottom:12 }}>
        <svg viewBox="0 0 100 100" style={{ width:'100%', height:180 }}><StickFigure frame={cur} color={t.blue} barY={anim.needsBar?14:undefined}/></svg>
        <div style={{ position:'absolute', bottom:8, left:0, right:0, textAlign:'center', fontSize:10, color:t.blue, letterSpacing:2, fontFamily:FONT, fontWeight:700 }}>{cur.label.toString().toUpperCase()}</div>
        <button onClick={()=>setPlaying(p=>!p)} style={{ position:'absolute', top:8, right:8, background:t.surface, border:`1px solid ${t.border}`, borderRadius:6, color:t.txt2, width:28, height:28, cursor:'pointer', fontSize:12 }}>{playing?'⏸':'▶'}</button>
      </div>
      <div style={{ display:'flex', justifyContent:'center', gap:6, marginBottom:14 }}>{anim.frames.map((_,i) => <div key={i} onClick={()=>{setIdx(i);setSubT(0);}} style={{width:i===idx?20:7,height:7,borderRadius:4,background:i===idx?t.blue:t.border,cursor:'pointer'}}/>)}</div>
    </div>
  );
};

const Positions: React.FC<{ exerciseId: string; t: Theme }> = ({ exerciseId, t }) => {
  const anim = ANIMATIONS[exerciseId];
  if (!anim) return null;
  const key = anim.frames.length >= 3 ? [anim.frames[0], anim.frames[Math.floor(anim.frames.length/2)], anim.frames[anim.frames.length-1]] : anim.frames;
  return (
    <div style={{ display:'grid', gridTemplateColumns:`repeat(${key.length},1fr)`, gap:8, marginBottom:14 }}>
      {key.map((frame,i) => (
        <div key={i} style={{ background:t.surface2, borderRadius:10, overflow:'hidden', textAlign:'center' }}>
          <svg viewBox="0 0 100 100" style={{ width:'100%', height:100 }}><StickFigure frame={frame} color={i===0?t.blue:i===key.length-1?t.green:t.gold} barY={anim.needsBar?14:undefined}/></svg>
          <div style={{ fontSize:8, color:t.txt2, padding:'4px 4px 6px', letterSpacing:1 }}>{frame.label.toString().toUpperCase()}</div>
        </div>
      ))}
    </div>
  );
};

export const ExerciseDemo: React.FC<{ t: Theme; exerciseId: string; onClose: () => void }> = ({ t, exerciseId, onClose }) => {
  const [tab, setTab] = useState<'animation'|'positions'|'steps'|'mistakes'>('animation');
  const ex = EXERCISE_REGISTRY[exerciseId];
  if (!ex) return null;
  const tabs = [{id:'animation',label:'DEMO'},{id:'positions',label:'POSITIONS'},{id:'steps',label:'HOW TO'},{id:'mistakes',label:'MISTAKES'}] as const;

  return (
    <div style={{ position:'fixed', inset:0, background:t.bg, zIndex:1000, overflowY:'auto', fontFamily:FONT, color:t.txt }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'20px 16px 12px', borderBottom:`1px solid ${t.border}`, position:'sticky', top:0, background:t.bg, zIndex:10 }}>
        <div><div style={{fontSize:9,color:t.txt2,letterSpacing:2,marginBottom:3}}>EXERCISE DEMO</div><div style={{fontSize:18,fontWeight:900}}>{ex.name}</div></div>
        <button onClick={onClose} style={{background:'transparent',border:'none',color:t.txt2,fontSize:20,cursor:'pointer'}}>✕</button>
      </div>
      <div style={{ padding:'16px 16px 36px' }}>
        <div style={{ fontSize:12, color:t.txt2, marginBottom:14 }}>{ex.category} · {ex.primaryMuscles.join(', ')} · Difficulty {ex.difficulty}/10</div>
        <div style={{ display:'flex', gap:4, marginBottom:16, background:t.surface2, borderRadius:10, padding:3 }}>
          {tabs.map(tb => <button key={tb.id} onClick={()=>setTab(tb.id)} style={{flex:1,padding:'7px 2px',borderRadius:8,border:'none',background:tab===tb.id?t.blue:'transparent',color:tab===tb.id?'#fff':t.txt2,fontSize:9,fontWeight:700,letterSpacing:1,cursor:'pointer',fontFamily:'inherit'}}>{tb.label}</button>)}
        </div>
        {tab === 'animation' && <Animation exerciseId={exerciseId} t={t}/>}
        {tab === 'positions' && <><div style={{fontSize:9,color:t.txt2,letterSpacing:2,marginBottom:12}}>KEY POSITIONS</div><Positions exerciseId={exerciseId} t={t}/></>}
        {tab === 'steps' && (<div><div style={{fontSize:9,color:t.txt2,letterSpacing:2,marginBottom:12}}>COACHING CUES</div>{ex.coachingCues.map((s,i) => <div key={i} style={{display:'flex',gap:10,padding:'10px 0',borderBottom:`1px solid ${t.border}`}}><div style={{background:`${t.blue}20`,color:t.blue,borderRadius:6,minWidth:24,height:24,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:900,flexShrink:0}}>{i+1}</div><div style={{fontSize:13,color:t.txt,lineHeight:1.5,paddingTop:2}}>{s}</div></div>)}<div style={{background:t.isDark?'#08101E':'#EBF4FF',border:`1px solid ${t.blue}22`,borderRadius:10,padding:'10px 12px',marginTop:12,fontSize:12,color:t.txt2}}>💨 {ex.breathingCue}</div></div>)}
        {tab === 'mistakes' && (<div><div style={{fontSize:9,color:t.txt2,letterSpacing:2,marginBottom:12}}>COMMON MISTAKES</div>{ex.commonMistakes.map((m,i) => <div key={i} style={{display:'flex',gap:10,padding:'10px 0',borderBottom:`1px solid ${t.border}`}}><div style={{fontSize:16,flexShrink:0}}>❌</div><div style={{fontSize:13,color:t.txt,lineHeight:1.5,paddingTop:2}}>{m}</div></div>)}{ex.modifications.length>0 && <div style={{background:t.isDark?'#0F0E00':'#FFFBE6',border:`1px solid ${t.gold}22`,borderRadius:10,padding:'10px 12px',marginTop:12,fontSize:12,color:t.txt2}}>🔄 Easier: {ex.modifications[0]}</div>}</div>)}
      </div>
    </div>
  );
};
