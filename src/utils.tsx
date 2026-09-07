import React, { useState, useEffect, useRef } from 'react';
import { Theme, FONT, Btn } from './ui';

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
export function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return Promise.resolve(false);
  if (Notification.permission === 'granted') return Promise.resolve(true);
  return Notification.requestPermission().then(p => p === 'granted');
}

export function scheduleWorkoutReminder(timeStr: string): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const [h,m] = timeStr.split(':').map(Number);
  const now = new Date(); const target = new Date();
  target.setHours(h,m,0,0);
  if (target <= now) target.setDate(target.getDate()+1);
  const delay = target.getTime() - now.getTime();
  setTimeout(() => {
    try { new Notification('Mike 2.0 — Time to train 💪', { body:'Your workout is ready.', icon:'/icon-192.png' }); } catch {}
    scheduleWorkoutReminder(timeStr);
  }, delay);
}

// ─── OFFLINE INDICATOR ────────────────────────────────────────────────────────
export const OfflineIndicator: React.FC<{ t: Theme }> = ({ t }) => {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  if (online) return null;
  return <div style={{ position:'fixed', top:0, left:0, right:0, zIndex:9998, background:t.surface, borderBottom:`1px solid ${t.gold}`, padding:'6px 16px', textAlign:'center', fontSize:10, color:t.gold, letterSpacing:2, fontFamily:FONT }}>📵 OFFLINE — All core features still work</div>;
};

// ─── BREATHING EXERCISE ───────────────────────────────────────────────────────
type BreathPhase = 'inhale'|'hold_in'|'exhale'|'hold_out';
const SEQ: { phase:BreathPhase; duration:number; label:string; instr:string }[] = [
  { phase:'inhale', duration:4, label:'BREATHE IN', instr:'Slow, deep breath through your nose' },
  { phase:'hold_in', duration:4, label:'HOLD', instr:'Hold the breath gently' },
  { phase:'exhale', duration:4, label:'BREATHE OUT', instr:'Slow exhale through your mouth' },
  { phase:'hold_out', duration:4, label:'HOLD', instr:'Empty lungs, hold gently' },
];
const PHASE_COLORS: Record<BreathPhase,string> = { inhale:'#3BA5FF', hold_in:'#FFD700', exhale:'#00FF88', hold_out:'#FF6B35' };

export const BreathingExercise: React.FC<{ t: Theme; onClose: () => void }> = ({ t, onClose }) => {
  const [idx, setIdx] = useState(0);
  const [countdown, setCountdown] = useState(4);
  const [cycles, setCycles] = useState(0);
  const [running, setRunning] = useState(false);
  const [scale, setScale] = useState(0.5);
  const ref = useRef<ReturnType<typeof setInterval>|null>(null);
  const phase = SEQ[idx]; const color = PHASE_COLORS[phase.phase];

  useEffect(() => {
    if (!running) return;
    ref.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          const next = (idx+1)%SEQ.length;
          if (next===0) setCycles(cy=>cy+1);
          setIdx(next);
          setScale(next===0||next===1?1:0.5);
          return SEQ[next].duration;
        }
        if (phase.phase==='inhale') setScale(s=>Math.min(s+0.5/phase.duration,1));
        else if (phase.phase==='exhale') setScale(s=>Math.max(s-0.5/phase.duration,0.5));
        return c-1;
      });
    },1000);
    return () => { if(ref.current) clearInterval(ref.current); };
  },[running, idx]);

  return (
    <div style={{ position:'fixed', inset:0, background:t.bg, zIndex:1500, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', fontFamily:FONT, color:t.txt, padding:24 }}>
      <div style={{ position:'absolute', top:20, right:20 }}><button onClick={onClose} style={{background:'transparent',border:'none',color:t.txt2,fontSize:20,cursor:'pointer'}}>✕</button></div>
      <div style={{ fontSize:9, color:t.txt2, letterSpacing:3, marginBottom:8 }}>BOX BREATHING</div>
      <div style={{ fontSize:14, fontWeight:900, marginBottom:4 }}>4-4-4-4 Method</div>
      <div style={{ fontSize:11, color:t.txt2, marginBottom:40, textAlign:'center' }}>Reduces fatigue · Calms nervous system</div>
      <div style={{ position:'relative', width:200, height:200, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:32 }}>
        <div style={{ position:'absolute', inset:0, borderRadius:'50%', border:`2px solid ${color}22` }}/>
        <div style={{ width:200*scale, height:200*scale, borderRadius:'50%', background:`radial-gradient(circle,${color}33,${color}11)`, border:`2px solid ${color}`, transition:'width 0.5s,height 0.5s,border-color 0.5s', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 0 30px ${color}33` }}>
          <div style={{ fontSize:36, fontWeight:900, color:running?color:t.txt2 }}>{countdown}</div>
        </div>
      </div>
      <div style={{ fontSize:20, fontWeight:900, color, letterSpacing:2, marginBottom:6 }}>{running?phase.label:'READY'}</div>
      <div style={{ fontSize:12, color:t.txt2, marginBottom:8, textAlign:'center' }}>{running?phase.instr:'Tap start to begin'}</div>
      {cycles>0 && <div style={{ fontSize:11, color:t.green, marginBottom:16 }}>✓ {cycles} cycle{cycles>1?'s':''} complete</div>}
      <button onClick={()=>{ if(running){if(ref.current)clearInterval(ref.current);setRunning(false);setIdx(0);setCountdown(4);setScale(0.5);setCycles(0);} else setRunning(true); }} style={{ background:running?t.surface:t.blue, border:running?`1px solid ${t.border}`:'none', borderRadius:12, color:running?t.txt2:'#fff', fontSize:13, fontWeight:900, letterSpacing:2, padding:'14px 32px', cursor:'pointer', fontFamily:FONT }}>{running?'STOP':'START'}</button>
    </div>
  );
};

// ─── PHASE COMPLETION SCREEN ──────────────────────────────────────────────────
const PHASE_DATA: Record<string,{title:string;subtitle:string;icon:string;color:string;message:string;next:string}> = {
  W4:  { title:'PHASE 1 COMPLETE', subtitle:'Weeks 1-4', icon:'🔥', color:'#FFD700', message:'Foundation built. Your body has adapted. The harder phase starts now.', next:'Phase 2: explosive movements and increased intensity. Weeks 5-8.' },
  W8:  { title:'PHASE 2 COMPLETE', subtitle:'Weeks 5-8', icon:'⚡', color:'#3BA5FF', message:'Mid-point reached. Strength and conditioning significantly above baseline.', next:'Phase 3 is peak — advanced skills, max intensity. Weeks 9-12.' },
  W12: { title:'PROGRAM COMPLETE', subtitle:'All 90 Days', icon:'👑', color:'#FF6B35', message:'You completed the full 90-day Mike 2.0 program. This is what consistency looks like.', next:'Infinite mesocycles begin now — Build, Overload, Peak, Deload, forever.' },
};

export const PhaseCompletionScreen: React.FC<{ t:Theme; phase:'W4'|'W8'|'W12'; stats:{workoutsCompleted:number;totalVolume:number;newPRs:number;consistencyRate:number}; onContinue:()=>void }> = ({ t, phase, stats, onContinue }) => {
  const [pulse, setPulse] = useState(false);
  const data = PHASE_DATA[phase];
  useEffect(() => { const i = setInterval(()=>setPulse(p=>!p),900); return ()=>clearInterval(i); },[]);
  return (
    <div style={{ position:'fixed', inset:0, background:t.bg, zIndex:1200, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:24, fontFamily:FONT, color:t.txt, overflowY:'auto' }}>
      <div style={{ position:'absolute', inset:0, background:`radial-gradient(circle at 50% 40%,${data.color}15 0%,transparent 65%)`, pointerEvents:'none' }}/>
      <div style={{ fontSize:72, transform:pulse?'scale(1.08)':'scale(1)', transition:'transform 0.5s', marginBottom:16 }}>{data.icon}</div>
      <div style={{ fontSize:10, color:data.color, letterSpacing:4, marginBottom:6 }}>{data.subtitle}</div>
      <div style={{ fontSize:26, fontWeight:900, letterSpacing:-1, background:`linear-gradient(135deg,${data.color},${t.blue})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', marginBottom:16 }}>{data.title}</div>
      <div style={{ fontSize:13, color:t.txt, maxWidth:300, lineHeight:1.6, marginBottom:28 }}>{data.message}</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, width:'100%', maxWidth:300, marginBottom:24 }}>
        {[['WORKOUTS',stats.workoutsCompleted],['TOTAL REPS',stats.totalVolume.toLocaleString()],['NEW PRs',stats.newPRs],['CONSISTENCY',`${stats.consistencyRate}%`]].map(([label,value]) => (
          <div key={label as string} style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:12, padding:'14px 8px' }}><div style={{fontSize:22,fontWeight:900,color:data.color}}>{value}</div><div style={{fontSize:8,color:t.txt2,letterSpacing:1,marginTop:3}}>{label}</div></div>
        ))}
      </div>
      <div style={{ background:t.surface, border:`1px solid ${data.color}33`, borderRadius:12, padding:'12px 16px', marginBottom:28, maxWidth:300, width:'100%' }}><div style={{fontSize:9,color:data.color,letterSpacing:2,marginBottom:6}}>WHAT'S NEXT</div><div style={{fontSize:12,color:t.txt2,lineHeight:1.5}}>{data.next}</div></div>
      <button onClick={onContinue} style={{ background:data.color, border:'none', borderRadius:12, color:phase==='W12'?'#fff':'#000', fontSize:13, fontWeight:900, letterSpacing:2, padding:'14px 32px', cursor:'pointer', fontFamily:FONT, width:'100%', maxWidth:300 }}>{phase==='W12'?'ENTER INFINITE MODE →':'START NEXT PHASE →'}</button>
    </div>
  );
};
