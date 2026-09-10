import React, { useState, useEffect, useRef } from 'react';
import { useStore } from './useStore';
import {
  Theme, DARK, LIGHT, useSystemTheme, Logo, PBar, Card, Btn, Lbl,
  StatBox, ExRow, Scr, Toggle, fmt, haptic, useAudio, useWakeLock, FONT,
} from './ui';
import { ScoreCard, AICoachCard, AnalyticsCharts, GamificationCard } from './dashboard';
import { ChatAssistant, FloatingChatBtn } from './ChatAssistant';
import { ExerciseDemo } from './ExerciseDemo';
import { OfflineIndicator, BreathingExercise, PhaseCompletionScreen, requestNotificationPermission, scheduleWorkoutReminder } from './utils';
import { EXERCISE_REGISTRY } from './registry';
import { PreWorkoutCheckIn, FitnessLevel, GeneratedWorkout, PlannedExercise } from './types';
import { ProgressPhotosView } from './ProgressPhotos';

interface TimedItem { name:string; duration:number; desc:string; }
const WARMUP_UPPER: TimedItem[] = [{name:'Arm circles',duration:30,desc:'Loosen the shoulders'},{name:'Scapular pull-ups',duration:20,desc:'Activate the back'},{name:'Shoulder rolls',duration:20,desc:'Slow big rolls'},{name:'Wrist circles',duration:20,desc:'Prep for pushing'},{name:'Jumping jacks',duration:30,desc:'Get the blood moving'}];
const WARMUP_LOWER: TimedItem[] = [{name:'Hip circles',duration:20,desc:'Big circles each direction'},{name:'Leg swings',duration:25,desc:'Hold bar, swing each leg'},{name:'Ankle circles',duration:20,desc:'Prep for jumping'},{name:'Bodyweight squats',duration:30,desc:'Slow controlled squats'},{name:'Jumping jacks',duration:30,desc:'Get the heart rate up'}];
const WARMUP_FULL: TimedItem[] = [{name:'Jumping jacks',duration:30,desc:'Get the blood moving'},{name:'Arm circles',duration:20,desc:'Loosen shoulders'},{name:'Hip circles',duration:20,desc:'Big circles'},{name:'Bodyweight squats',duration:25,desc:'Slow controlled'},{name:'Scapular pull-ups',duration:20,desc:'Activate the back'}];
const COOLDOWN: TimedItem[] = [{name:'Chest doorframe stretch',duration:30,desc:'Rotate body away'},{name:"Child's pose",duration:40,desc:'Breathe into your back'},{name:'Lat stretch on bar',duration:30,desc:'One side at a time'},{name:'Hip flexor lunge',duration:35,desc:'Squeeze back glute'},{name:'Hamstring fold',duration:30,desc:'Let gravity work'},{name:'Shoulder cross stretch',duration:25,desc:'10s each side'}];
const REST_DAY: TimedItem[] = [{name:'Cat-cow stretch',duration:40,desc:'Arch and round slowly'},{name:'Pigeon pose (left)',duration:45,desc:'Deep hip opener'},{name:'Pigeon pose (right)',duration:45,desc:'Switch sides'},{name:'Thoracic rotation',duration:30,desc:'Rotate upper body'},{name:"Child's pose",duration:45,desc:'Breathe into back'},{name:'Shoulder cross stretch',duration:30,desc:'10s each side'},{name:'Neck rolls',duration:25,desc:'Never force it'},{name:'Standing forward fold',duration:40,desc:'Hang heavy'}];

const MILESTONES: Record<number,string> = { 1:'Day 1. Every legend starts here.', 7:'One week in. You showed up.', 14:'Two weeks. The habit is forming.', 21:'21 days. Habits lock in here.', 30:'One third done. Your body is already different.', 45:'Halfway. 45 days of showing up.', 60:'Two thirds through. Elite territory.', 75:'The final push.', 90:'90 DAYS COMPLETE. You became Mike 2.0.' };
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS_S=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export default function App() {
  const isDark = useSystemTheme();
  const t = isDark ? DARK : LIGHT;
  const store = useStore();
  const [view, setView] = useState<string>(!store.profile.onboarded ? 'onboarding' : 'home');
  const [toast, setToast] = useState<{msg:string;clr:string}|null>(null);
  const [checkin, setCheckin] = useState<PreWorkoutCheckIn|null>(null);
  const [milestoneDay, setMilestoneDay] = useState<number|null>(null);
  const [phaseCompletion, setPhaseCompletion] = useState<'W4'|'W8'|'W12'|null>(null);
  const [pendingLog, setPendingLog] = useState<any[]>([]);
  const [pendingPRs, setPendingPRs] = useState<Record<string,number>>({});
  const [chatOpen, setChatOpen] = useState(false);
  const [demoExercise, setDemoExercise] = useState<string|null>(null);
  const [breathingOpen, setBreathingOpen] = useState(false);

  const notify = (msg:string, clr=t.green) => { setToast({msg,clr}); setTimeout(()=>setToast(null),3200); };

  function checkForMilestone(day: number) {
    if (MILESTONES[day]) { setMilestoneDay(day); setView('milestone'); return true; }
    if (day === 28) { setPhaseCompletion('W4'); setView('phasecomplete'); return true; }
    if (day === 56) { setPhaseCompletion('W8'); setView('phasecomplete'); return true; }
    if (day === 90) { setPhaseCompletion('W12'); setView('phasecomplete'); return true; }
    return false;
  }

  function finishWorkout(exerciseLogs: any[], newPRs: Record<string,number>, note: string, durationMinutes: number) {
    const day = store.training.calendarDay;
    store.logWorkout(exerciseLogs, checkin!, store.training.nextWorkout?.focus ?? 'Workout', note, durationMinutes, newPRs);
    setCheckin(null);
    if (!checkForMilestone(day)) {
      setView('home');
      notify(`Day ${day} complete!${Object.keys(newPRs).length ? ` ${Object.keys(newPRs).length} new PR!` : ''}`);
    }
    if (store.profile.settings.haptics) haptic([100,50,100]);
  }

  const scale = store.profile.settings.fontSize === 'large' ? 1.15 : 1;

  return (
    <div style={{ fontSize:`${scale}em`, minHeight:'100vh', background:t.bg }}>
      <OfflineIndicator t={t}/>
      {toast && <div style={{position:'fixed',top:16,left:'50%',transform:'translateX(-50%)',background:t.surface,border:`1px solid ${toast.clr}`,borderRadius:8,padding:'10px 18px',fontSize:12,fontWeight:700,zIndex:9999,whiteSpace:'nowrap',letterSpacing:1,color:toast.clr}}>{toast.msg}</div>}

      {view==='onboarding' && <Onboarding t={t} onDone={(sd,lvl)=>{store.updateProfile({startDate:sd,fitnessLevel:lvl,onboarded:true});setView('home');requestNotificationPermission();}}/>}
      {view==='home' && <Home t={t} store={store} onStart={()=>{const w=store.training.nextWorkout; if(!w||w.exercises.length===0){setView('restday');}else{setView('checkin');}}} onNav={setView} onOpenDemo={setDemoExercise}/>}
      {view==='checkin' && <CheckinView t={t} onDone={c=>{setCheckin(c);setView('warmup');}} onBack={()=>setView('home')}/>}
      {view==='warmup' && <TimedSeq t={t} title='WARM-UP' items={store.training.nextWorkout?.warmupType==='upper'?WARMUP_UPPER:store.training.nextWorkout?.warmupType==='lower'?WARMUP_LOWER:WARMUP_FULL} color={t.gold} onDone={()=>setView('workout')} onSkip={()=>setView('workout')}/>}
      {view==='workout' && <WorkoutView t={t} workout={store.training.nextWorkout!} checkin={checkin} prs={store.prs} sessions={store.sessions} settings={store.profile.settings} onOpenDemo={setDemoExercise} onOpenBreathing={()=>setBreathingOpen(true)} onDone={(logs,prs,dur)=>{setPendingLog(logs);setPendingPRs(prs);sessionStorage.setItem('_dur',String(dur));setView('cooldown');}} onExit={()=>{setCheckin(null);setView('home');}}/>}
      {view==='cooldown' && <TimedSeq t={t} title='COOL-DOWN' items={COOLDOWN} color={t.blueLt} onDone={()=>setView('summary')} onSkip={()=>setView('summary')} skipLabel='Skip to summary'/>}
      {view==='summary' && <SummaryView t={t} dayNum={store.training.calendarDay} exerciseLogs={pendingLog} newPRs={pendingPRs} onSave={note=>finishWorkout(pendingLog,pendingPRs,note,Number(sessionStorage.getItem('_dur')||35))} onBack={()=>setView('home')}/>}
      {view==='restday' && <TimedSeq t={t} title='RECOVERY' items={REST_DAY} color={t.green} onDone={()=>{store.logRestDay('Recovery day');setView('home');notify('Recovery logged');}} onSkip={()=>setView('home')} skipLabel='Skip & log'/>}
      {view==='milestone' && <MilestoneView t={t} day={milestoneDay||1} onContinue={()=>setView('home')}/>}
      {view==='phasecomplete' && phaseCompletion && <PhaseCompletionScreen t={t} phase={phaseCompletion} stats={{workoutsCompleted:store.training.totalWorkoutsCompleted,totalVolume:store.sessions.reduce((a,s)=>a+s.totalVolume,0),newPRs:store.prs.length,consistencyRate:store.transformation?.consistencyIndex??0}} onContinue={()=>{setPhaseCompletion(null);setView('home');}}/>}
      {view==='progress' && <ProgressView t={t} store={store} onBack={()=>setView('home')} onPhotos={()=>setView('photos')}/>}
      {view==='photos' && <ProgressPhotosView t={t} store={store} onBack={()=>setView('progress')}/>}
      {view==='calendar' && <CalendarView t={t} store={store} onBack={()=>setView('home')}/>}
      {view==='library' && <LibraryView t={t} onBack={()=>setView('home')} onOpenDemo={setDemoExercise}/>}
      {view==='athlete' && <AthleteView t={t} store={store} onBack={()=>setView('home')}/>}
      {view==='settings' && <SettingsView t={t} store={store} onBack={()=>setView('home')}/>}

      {demoExercise && <ExerciseDemo t={t} exerciseId={demoExercise} onClose={()=>setDemoExercise(null)}/>}
      {chatOpen && <ChatAssistant t={t} data={store.data} onClose={()=>setChatOpen(false)}/>}
      {breathingOpen && <BreathingExercise t={t} onClose={()=>setBreathingOpen(false)}/>}
      {store.profile.settings.floatingChatVisible && !chatOpen && !demoExercise && !breathingOpen && view!=='onboarding' && <FloatingChatBtn t={t} onClick={()=>setChatOpen(true)} visible={true}/>}
    </div>
  );
}

const Onboarding: React.FC<{t:Theme;onDone:(sd:string,lvl:FitnessLevel)=>void}> = ({t,onDone}) => {
  const [slide,setSlide]=useState(0);
  const [sd,setSd]=useState(new Date().toISOString().split('T')[0]);
  const [level,setLevel]=useState<FitnessLevel>('intermediate');
  const LEVELS: [string,FitnessLevel,string][] = [['🌱','beginner','Never trained'],['🔥','intermediate','Some experience'],['⚡','advanced','Regular trainer']];
  const slides = [
    {body:'90 days.\nOne pull-up bar.\nYour body as the weight.',sub:'A complete Transformation Operating System - training, AI coaching, and progression that never stops evolving.'},
    {icon:'🏋️',title:'WHAT YOU NEED',body:'Just a pull-up bar.',sub:'Everything runs on bodyweight. No gym. No equipment. Train anywhere.'},
    {icon:'🧠',title:'AI COACH',body:'It learns as you train.',sub:'Every workout feeds an athlete model that adapts your training automatically - progression, deloads, and plateau-breaking, all explained.'},
    {icon:'💪',title:'FITNESS LEVEL',body:'How are you starting?',sub:'This calibrates your starting point.',hasLevel:true},
    {icon:'📅',title:'START DATE',body:'When do you begin?',sub:'Day numbers calculate automatically from here - forever, even past day 90.',hasDate:true},
  ];
  const s = slides[slide];
  return (
    <Scr t={t} style={{justifyContent:'space-between'}}>
      <div style={{flex:1,display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center',textAlign:'center',padding:'16px 0'}}>
        {slide===0?(<div style={{marginBottom:28}}><Logo t={t} size={52}/><div style={{fontSize:10,letterSpacing:3,color:t.txt2,marginTop:6}}>TRANSFORMATION OPERATING SYSTEM</div></div>):(<div style={{fontSize:52,marginBottom:20}}>{s.icon}</div>)}
        {s.title && <Lbl t={t} color={t.blue}>{s.title}</Lbl>}
        <div style={{fontSize:20,fontWeight:900,letterSpacing:-0.5,marginBottom:12,lineHeight:1.3,whiteSpace:'pre-line'}}>{s.body}</div>
        <div style={{fontSize:12,color:t.txt2,lineHeight:1.6,maxWidth:290,marginBottom:20}}>{s.sub}</div>
        {s.hasLevel && <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,width:'100%'}}>{LEVELS.map(([ic,lv,sub]) => <button key={lv} onClick={()=>setLevel(lv)} style={{background:level===lv?t.blueGlow:t.surface,border:`1px solid ${level===lv?t.blue:t.border}`,borderRadius:12,padding:'14px 6px',cursor:'pointer',fontFamily:FONT,textAlign:'center'}}><div style={{fontSize:24}}>{ic}</div><div style={{fontSize:10,fontWeight:700,color:level===lv?t.blue:t.txt,marginTop:4,textTransform:'capitalize'}}>{lv}</div><div style={{fontSize:9,color:t.txt2,marginTop:2}}>{sub}</div></button>)}</div>}
        {s.hasDate && <input type='date' value={sd} onChange={e=>setSd(e.target.value)} style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:10,color:t.txt,fontSize:16,padding:'12px 14px',width:'100%',fontFamily:FONT,textAlign:'center'}}/>}
      </div>
      <div>
        <div style={{display:'flex',justifyContent:'center',gap:8,marginBottom:16}}>{slides.map((_,i)=><div key={i} style={{width:i===slide?18:7,height:7,borderRadius:4,background:i===slide?t.blue:t.border,transition:'width 0.3s'}}/>)}</div>
        <Btn t={t} onClick={()=>slide<slides.length-1?setSlide(s=>s+1):onDone(sd,level)}>{slide===slides.length-1?'START MIKE 2.0 →':'NEXT →'}</Btn>
      </div>
    </Scr>
  );
};

const Home: React.FC<{t:Theme;store:ReturnType<typeof useStore>;onStart:()=>void;onNav:(v:string)=>void;onOpenDemo:(id:string)=>void}> = ({t,store,onStart,onNav,onOpenDemo}) => {
  const now = new Date();
  const workout = store.training.nextWorkout;
  const isRest = !workout || workout.exercises.length === 0;
  const pct = Math.round((store.training.programDay/90)*100);
  const activeInsights = store.ai?.insights.filter(i=>!i.dismissed).slice(0,1) ?? [];
  const doneToday = store.sessions.some(s => s.calendarDay === store.training.calendarDay);
  const activeMissions = store.gamification.missions.filter(m=>m.status==='active').slice(0,2);

  return (
    <Scr t={t}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
        <div><div style={{fontSize:9,color:t.txt3,letterSpacing:2,marginBottom:3}}>{DAYS_S[now.getDay()]}, {MONTHS[now.getMonth()]} {now.getDate()}</div><Logo t={t} size={40}/></div>
        <div style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:10,padding:'8px 12px',textAlign:'center'}}><div style={{fontSize:18}}>🔥</div><div style={{fontSize:22,fontWeight:900,color:t.gold,lineHeight:1}}>{store.training.currentStreak}</div><div style={{fontSize:8,color:t.txt2,letterSpacing:1}}>STREAK</div></div>
      </div>

      {store.transformation && <ScoreCard t={t} transformation={store.transformation}/>}

      {store.training.isPost90 && <div style={{background:t.isDark?'#0A1628':'#EBF4FF',border:`1px solid ${t.blue}33`,borderRadius:10,padding:'8px 12px',marginBottom:12,fontSize:11,color:t.blue,textAlign:'center'}}>🔁 Mesocycle {store.training.mesocycleNumber} · {store.training.currentPhase.toUpperCase()} · Week {store.training.mesocycleWeek}/4 · Infinite Mode</div>}
      {store.adaptation?.deloadActive && <div style={{background:t.isDark?'#0A1A0A':'#E8F8E8',border:`1px solid ${t.green}33`,borderRadius:10,padding:'8px 12px',marginBottom:12,fontSize:11,color:t.green,textAlign:'center'}}>📉 DELOAD - {store.adaptation.deloadReason}</div>}
      {store.missedDays.length>0 && store.missedDays.length<=5 && (<div style={{background:t.isDark?'#1A0A00':'#FFF4E6',border:`1px solid ${t.gold}44`,borderRadius:10,padding:'10px 12px',marginBottom:12}}><div style={{fontSize:11,color:t.gold,marginBottom:6}}>⚠️ Missed {store.missedDays.length} day{store.missedDays.length>1?'s':''}</div><div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{store.missedDays.slice(-5).map(d=><button key={d} onClick={()=>{store.logRetroactive(d);}} style={{background:'transparent',border:`1px solid ${t.gold}44`,borderRadius:6,color:t.gold,fontSize:10,padding:'3px 8px',cursor:'pointer',fontFamily:FONT}}>Log Day {d}</button>)}</div></div>)}

      <div style={{marginBottom:16}}><div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:t.txt2,marginBottom:5,letterSpacing:1}}><span>Day {store.training.calendarDay}{!store.training.isPost90?' / 90':''}</span><span style={{color:t.blue,fontWeight:700}}>{store.training.isPost90?'∞':`${pct}%`}</span></div><PBar t={t} pct={store.training.isPost90?100:pct}/></div>

      <Card t={t} glow>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
          <div><Lbl t={t} color={t.blue}>TODAY</Lbl><div style={{fontSize:18,fontWeight:700}}>{workout?.focus ?? 'Recovery'}</div></div>
          <div style={{textAlign:'right'}}>{doneToday && <div style={{background:`${t.green}20`,color:t.green,border:`1px solid ${t.green}44`,borderRadius:6,padding:'3px 8px',fontSize:10,fontWeight:700,marginBottom:4}}>✓ DONE</div>}<div style={{fontSize:10,color:t.txt2,letterSpacing:1}}>{isRest?'REST DAY':`~${workout?.estimatedDuration} MIN`}</div></div>
        </div>
        {isRest ? (<div style={{textAlign:'center',padding:'16px 0'}}><div style={{fontSize:36}}>🧘</div><div style={{color:t.txt2,marginTop:8,fontSize:12}}>Stretch · Walk · Breathe · Recover</div></div>)
        : (<div style={{marginBottom:10}}>{workout!.exercises.map((ex,i) => (
            <div key={i} onClick={()=>onOpenDemo(ex.exerciseId)} style={{cursor:'pointer'}}>
              <ExRow t={t} name={ex.exerciseName} sets={ex.sets} reps={ex.targetReps} type={ex.type}/>
            </div>
          ))}</div>)}
        {workout?.reasoning && <div style={{fontSize:10,color:t.txt3,marginBottom:8,fontStyle:'italic'}}>🧠 {workout.reasoning}</div>}
        <Btn t={t} onClick={onStart}>{isRest?'START RECOVERY →':doneToday?'REDO WORKOUT →':'START WORKOUT →'}</Btn>
      </Card>

      {activeInsights.length>0 && (<Card t={t} style={{padding:'12px 14px',borderColor:`${t.blue}33`}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}><Lbl t={t} color={t.blue} style={{marginBottom:0}}>🧠 AI COACH</Lbl><button onClick={()=>onNav('progress')} style={{background:'transparent',border:'none',color:t.blue,fontSize:10,cursor:'pointer',fontFamily:FONT}}>See all →</button></div><div style={{fontSize:12,color:t.txt2,lineHeight:1.5}}>{activeInsights[0].message}</div></Card>)}

      {activeMissions.length>0 && (<Card t={t} style={{padding:'12px 14px'}}><Lbl t={t}>ACTIVE MISSIONS</Lbl>{activeMissions.map(m => <div key={m.id} style={{display:'flex',justifyContent:'space-between',fontSize:12,padding:'4px 0'}}><span style={{color:t.txt}}>{m.icon} {m.title}</span><span style={{color:t.txt2}}>{m.current}/{m.target}</span></div>)}</Card>)}

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:12}}><StatBox t={t} label='DONE' value={store.training.totalWorkoutsCompleted}/><StatBox t={t} label='XP' value={store.gamification.xp} color={t.gold}/><StatBox t={t} label='STREAK' value={store.training.currentStreak} color={t.gold}/></div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr',gap:6}}>{[['📅','CAL','calendar'],['📊','PROG','progress'],['📖','EX','library'],['🧬','ATH','athlete'],['⚙️','SET','settings']].map(([ic,lb,v]) => <button key={v} onClick={()=>onNav(v)} style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:10,padding:'10px 4px',textAlign:'center',cursor:'pointer',fontFamily:FONT}}><div style={{fontSize:16}}>{ic}</div><div style={{fontSize:7,color:t.txt2,letterSpacing:1,marginTop:3,fontWeight:700}}>{lb}</div></button>)}</div>
    </Scr>
  );
};

const CheckinView: React.FC<{t:Theme;onDone:(c:PreWorkoutCheckIn)=>void;onBack:()=>void}> = ({t,onDone,onBack}) => {
  const [energy,setEnergy]=useState<number|null>(null);
  const [soreness,setSoreness]=useState<number|null>(null);
  const EN=[['😴','LOW'],['😐','OKAY'],['💪','GOOD'],['⚡','GREAT']];
  const SO=[['🟢','FRESH'],['🟡','MILD'],['🟠','SORE'],['🔴','WRECKED']];
  const ready = energy!==null && soreness!==null;
  return (
    <Scr t={t}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20}}><Btn t={t} variant='ghost' onClick={onBack}>← Back</Btn><div style={{fontSize:14,fontWeight:900,letterSpacing:2}}>PRE-WORKOUT</div></div>
      <div style={{fontSize:12,color:t.txt2,marginBottom:20}}>Quick check-in before we start.</div>
      <Lbl t={t} color={t.blue}>ENERGY LEVEL</Lbl>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:6,marginBottom:20}}>{EN.map(([ic,lb],i) => <button key={i} onClick={()=>{setEnergy(i);haptic([30]);}} style={{background:energy===i?t.blueGlow:t.surface,border:`1px solid ${energy===i?t.blue:t.border}`,borderRadius:10,padding:'12px 4px',cursor:'pointer',fontFamily:FONT,textAlign:'center'}}><div style={{fontSize:22}}>{ic}</div><div style={{fontSize:8,marginTop:4,color:energy===i?t.blue:t.txt2,letterSpacing:1,fontWeight:700}}>{lb}</div></button>)}</div>
      <Lbl t={t} color={t.blue}>SORENESS</Lbl>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:6,marginBottom:20}}>{SO.map(([ic,lb],i) => <button key={i} onClick={()=>{setSoreness(i);haptic([30]);}} style={{background:soreness===i?t.blueGlow:t.surface,border:`1px solid ${soreness===i?t.blue:t.border}`,borderRadius:10,padding:'12px 4px',cursor:'pointer',fontFamily:FONT,textAlign:'center'}}><div style={{fontSize:22}}>{ic}</div><div style={{fontSize:8,marginTop:4,color:soreness===i?t.blue:t.txt2,letterSpacing:1,fontWeight:700}}>{lb}</div></button>)}</div>
      {ready && <div style={{background:t.isDark?'#0A1628':'#EBF4FF',border:`1px solid ${t.blue}22`,borderRadius:10,padding:'12px 14px',marginBottom:16,textAlign:'center'}}><div style={{fontSize:12,color:(soreness??0)>=3?t.gold:(energy??0)>=2?t.green:t.txt2}}>{(soreness??0)>=3?'⚠️ Very sore - rest extended automatically':(energy??0)>=2?'✓ Ready. Let\'s go.':'Take it steady - form over reps.'}</div></div>}
      <Btn t={t} disabled={!ready} onClick={()=>onDone({energy:energy!,soreness:soreness!,timestamp:new Date().toISOString()})}>LET'S GO →</Btn>
    </Scr>
  );
};

const TimedSeq: React.FC<{t:Theme;title:string;items:TimedItem[];color:string;onDone:()=>void;onSkip:()=>void;skipLabel?:string}> = ({t,title,items,color,onDone,onSkip,skipLabel='Skip'}) => {
  const [idx,setIdx]=useState(0);
  const [timer,setTimer]=useState(items[0].duration);
  const [running,setRunning]=useState(false);
  const audio = useAudio();
  const ref = useRef<ReturnType<typeof setInterval>|null>(null);
  useEffect(() => {
    if (!running) return;
    ref.current = setInterval(() => { setTimer(tm => {
      if (tm<=3 && tm>1) audio.countdown();
      if (tm<=1) { if(ref.current)clearInterval(ref.current); setRunning(false); audio.done(); haptic([50,30,50]);
        if (idx+1<items.length) { setIdx(i=>i+1); setTimer(items[idx+1].duration); } else onDone();
        return 0; }
      return tm-1;
    }); }, 1000);
    return () => { if(ref.current)clearInterval(ref.current); };
  }, [running, idx]);
  const item = items[idx];
  return (
    <Scr t={t}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}><Btn t={t} variant='ghost' onClick={onSkip}>{skipLabel}</Btn><div style={{fontSize:10,color,letterSpacing:2,fontWeight:700}}>{title}</div><div style={{fontSize:10,color:t.txt2}}>{idx+1}/{items.length}</div></div>
      <PBar t={t} pct={(idx/items.length)*100} color={`linear-gradient(90deg,${color},${color}88)`}/>
      <Card t={t} style={{marginTop:16,textAlign:'center'}}>
        <Lbl t={t} color={color}>EXERCISE {idx+1} OF {items.length}</Lbl>
        <div style={{fontSize:22,fontWeight:900,marginBottom:8}}>{item.name}</div>
        <div style={{fontSize:12,color:t.txt2,marginBottom:22,lineHeight:1.5}}>{item.desc}</div>
        <div style={{fontSize:56,fontWeight:900,letterSpacing:-3,color:timer<=5?t.red:t.txt,marginBottom:16}}>{fmt(timer)}</div>
        {!running ? <Btn t={t} style={{background:color,color:'#000'}} onClick={()=>setRunning(true)}>▶ START</Btn> : <Btn t={t} variant='secondary' onClick={()=>{if(ref.current)clearInterval(ref.current);setRunning(false);if(idx+1<items.length){setIdx(i=>i+1);setTimer(items[idx+1].duration);}else onDone();}}>Next →</Btn>}
      </Card>
      <div style={{display:'flex',gap:6,marginTop:14,justifyContent:'center'}}>{items.map((_,i) => <div key={i} style={{width:7,height:7,borderRadius:4,background:i<idx?color:i===idx?t.txt:t.border}}/>)}</div>
    </Scr>
  );
};

const WorkoutView: React.FC<{t:Theme;workout:GeneratedWorkout;checkin:PreWorkoutCheckIn|null;prs:any[];sessions:any[];settings:any;onOpenDemo:(id:string)=>void;onOpenBreathing:()=>void;onDone:(logs:any[],newPRs:Record<string,number>,dur:number)=>void;onExit:()=>void}> = ({t,workout,checkin,prs,sessions,settings,onOpenDemo,onOpenBreathing,onDone,onExit}) => {
  const exs = workout.exercises;
  const [ei,setEi]=useState(0);
  const [si,setSi]=useState(0);
  const [phase,setPhase]=useState('intro');
  const [timer,setTimer]=useState(0);
  const [running,setRunning]=useState(false);
  const [tapCount,setTapCount]=useState(0);
  const [repInput,setRepInput]=useState('');
  const [logs,setLogs]=useState<Record<number,{repsPerSet:number[];durationsPerSet:number[];setTags:string[];executionStatus:('completed'|'failed'|'skipped'|'abandoned')[];usedModification:boolean;modificationLabel?:string;performedExerciseId:string;performedExerciseName:string}>>({});
  const [newPRs,setNewPRs]=useState<Record<string,number>>({});
  const [tipIdx,setTipIdx]=useState(0);
  const [useMod,setUseMod]=useState<Record<number,boolean>>({});
  const [paused,setPaused]=useState(false);
  const startTimeRef = useRef(Date.now());
  const ref = useRef<ReturnType<typeof setInterval>|null>(null);
  const audio = useAudio();
  const wake = useWakeLock();
  useEffect(() => { wake.acquire(); return () => wake.release(); }, []);

  const ex = exs[ei];
  const exDef = ex ? EXERCISE_REGISTRY[ex.exerciseId] : undefined;
  const performedExerciseId = ex && useMod[ei] && exDef?.regressionId ? exDef.regressionId : ex?.exerciseId;
  const performedDef = performedExerciseId ? EXERCISE_REGISTRY[performedExerciseId] : undefined;
  const isTimed = Boolean(performedDef?.holdRange) || ex?.type === 'timed';
  const activeTargetDuration = isTimed
    ? (useMod[ei] && performedDef?.holdRange
      ? Math.round((performedDef.holdRange[0] + performedDef.holdRange[1]) / 2)
      : (ex?.targetDuration ?? 30))
    : undefined;
  const activeTargetReps = !isTimed && ex?.targetReps !== 'max' && performedDef
    ? Math.max(performedDef.repRange[0], Math.min(performedDef.repRange[1], ex.targetReps))
    : ex?.targetReps;
  const REST = checkin && checkin.soreness>=3 ? 90 : checkin && checkin.energy<=1 ? 75 : ex?.restSeconds ?? 60;
  const prVal = prs.find(p => p.exerciseId === performedExerciseId)?.value;
  const lastSessionWithEx = ex ? [...sessions].reverse().find(s => s.exercises?.some((e:any) => e.exerciseId === performedExerciseId)) : undefined;
  const lastLog = lastSessionWithEx?.exercises.find((e:any) => e.exerciseId === performedExerciseId);
  const lastValue = lastLog ? (isTimed ? Math.max(...(lastLog.durationsPerSet ?? [0])) : Math.max(...(lastLog.repsPerSet ?? [0]))) : null;

  useEffect(() => {
    if (!running || paused) return;
    ref.current = setInterval(() => { setTimer(tm => {
      if (tm<=3 && tm>1 && settings.audio!==false) audio.countdown();
      if (tm<=1) { if(ref.current)clearInterval(ref.current); setRunning(false);
        if (phase==='work') {
          if(settings.audio!==false)audio.done();
          if(settings.haptics!==false)haptic([80,30,80]);
          if (isTimed) logSet('good', activeTargetDuration ?? 30);
          else startRest();
        }
        else if (phase==='rest') { if(settings.audio!==false)audio.restOver(); if(settings.haptics!==false)haptic([50,30,50,30,100]); advance(); }
        return 0; }
      return tm-1;
    }); }, 1000);
    return () => { if(ref.current)clearInterval(ref.current); };
  }, [running, phase, paused]);

  const startWork = () => { setPhase('work'); setTapCount(0); setRepInput(''); if (isTimed) { setTimer(activeTargetDuration ?? 30); setRunning(true); } };
  const startRest = () => { setPhase('rest'); setTimer(REST); setRunning(true); };
  const advance = () => {
    if (si+1 < ex.sets) { setSi(s=>s+1); setPhase('intro'); }
    else if (ei+1 < exs.length) { setEi(e=>e+1); setSi(0); setPhase('intro'); setTipIdx(0); }
    else {
      const finalLogs = exs.map((planned, index) => {
        const l = logs[index] ?? {repsPerSet:[],durationsPerSet:[],setTags:[],executionStatus:[],usedModification:false,performedExerciseId:(useMod[index] && EXERCISE_REGISTRY[planned.exerciseId]?.regressionId) ? EXERCISE_REGISTRY[planned.exerciseId].regressionId! : planned.exerciseId,performedExerciseName:(useMod[index] && EXERCISE_REGISTRY[planned.exerciseId]?.regressionId) ? EXERCISE_REGISTRY[EXERCISE_REGISTRY[planned.exerciseId].regressionId!]?.name ?? planned.exerciseName : planned.exerciseName};
        return {
          exerciseId:l.performedExerciseId,
          exerciseName:l.performedExerciseName,
          plannedExerciseId:planned.exerciseId,
          plannedExerciseName:planned.exerciseName,
          sets:planned.sets,
          repsPerSet:l.repsPerSet,
          durationsPerSet:l.durationsPerSet,
          type: (l.durationsPerSet.length > 0 ? 'timed' : planned.type),
          setTags:l.setTags,
          executionStatus:l.executionStatus,
          targetReps: (useMod[index] && EXERCISE_REGISTRY[planned.exerciseId]?.regressionId && EXERCISE_REGISTRY[EXERCISE_REGISTRY[planned.exerciseId].regressionId!])
            ? (EXERCISE_REGISTRY[EXERCISE_REGISTRY[planned.exerciseId].regressionId!]?.holdRange ? planned.targetReps === 'max' ? 'max' : Math.max(EXERCISE_REGISTRY[EXERCISE_REGISTRY[planned.exerciseId].regressionId!].repRange[0], Math.min(EXERCISE_REGISTRY[EXERCISE_REGISTRY[planned.exerciseId].regressionId!].repRange[1], Number(planned.targetReps))) : planned.targetReps)
            : planned.targetReps,
          targetDuration: (useMod[index] && EXERCISE_REGISTRY[planned.exerciseId]?.regressionId && EXERCISE_REGISTRY[EXERCISE_REGISTRY[planned.exerciseId].regressionId!]?.holdRange)
            ? Math.round((EXERCISE_REGISTRY[EXERCISE_REGISTRY[planned.exerciseId].regressionId!].holdRange![0] + EXERCISE_REGISTRY[EXERCISE_REGISTRY[planned.exerciseId].regressionId!].holdRange![1]) / 2)
            : planned.targetDuration,
          usedModification:l.usedModification,
          modificationLabel:l.modificationLabel,
        };
      });
      const durMin = Math.max(1, Math.round((Date.now()-startTimeRef.current)/60000));
      onDone(finalLogs, newPRs, durMin);
    }
  };

  function logSet(tag: 'easy'|'good'|'hard'|'failed', measuredValue?: number) {
    const key = ei;
    const value = isTimed
      ? Math.max(1, Math.min(activeTargetDuration ?? 3600, measuredValue ?? ((activeTargetDuration ?? 30) - timer)))
      : Math.max(0, Math.round(measuredValue ?? (tapCount>0 ? tapCount : Number(repInput)||0)));
    if (!isTimed && value <= 0) return;
    setLogs(prev => {
      const cur = prev[key] ?? {repsPerSet:[],durationsPerSet:[],setTags:[],executionStatus:[],usedModification:false,performedExerciseId:(useMod[ei] && exDef?.regressionId) ? exDef.regressionId : ex.exerciseId,performedExerciseName:(useMod[ei] && exDef?.regressionId) ? EXERCISE_REGISTRY[exDef.regressionId]?.name ?? ex.exerciseName : ex.exerciseName,usedModification:Boolean(useMod[ei]),modificationLabel:(useMod[ei] && exDef?.regressionId) ? EXERCISE_REGISTRY[exDef.regressionId]?.name : undefined};
      return { ...prev, [key]: {
        ...cur,
        repsPerSet: isTimed ? cur.repsPerSet : [...cur.repsPerSet, value],
        durationsPerSet: isTimed ? [...cur.durationsPerSet, value] : cur.durationsPerSet,
        setTags: [...cur.setTags, tag],
        executionStatus: [...cur.executionStatus, tag === 'failed' ? 'failed' : 'completed'],
      }};
    });
    if (ex.targetReps==='max' && !isTimed && value>0) {
      const old = prVal ?? 0;
      if (value>old) { setNewPRs(p=>({...p,[performedDef?.name ?? ex.exerciseName]:value})); if(settings.audio!==false)audio.pr(); if(settings.haptics!==false)haptic([50,30,50,30,50,30,200]); }
    }
    setRepInput(''); setTapCount(0); startRest();
  }

  const totalSets = exs.reduce((a,e)=>a+e.sets,0);
  const doneSets = exs.slice(0,ei).reduce((a,e)=>a+e.sets,0)+si;
  const prog = totalSets ? (doneSets/totalSets)*100 : 0;

  return (
    <Scr t={t}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
        <Btn t={t} variant='ghost' onClick={onExit}>✕</Btn>
        <div style={{fontSize:10,color:t.txt2,letterSpacing:2}}>{workout.focus.toUpperCase()}</div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <button onClick={onOpenBreathing} style={{background:'transparent',border:'none',color:t.txt2,fontSize:14,cursor:'pointer'}}>💨</button>
          <button onClick={()=>{setPaused(p=>!p);if(ref.current)clearInterval(ref.current);setRunning(r=>!r);}} style={{background:'transparent',border:'none',color:t.txt2,fontSize:16,cursor:'pointer'}}>{paused?'▶':'⏸'}</button>
          <div style={{fontSize:10,color:t.txt2}}>{ei+1}/{exs.length}</div>
        </div>
      </div>
      <PBar t={t} pct={prog}/>
      {paused && <div style={{textAlign:'center',padding:'8px',background:`${t.gold}15`,borderRadius:8,margin:'8px 0',fontSize:11,color:t.gold}}>⏸ PAUSED</div>}

      <Card t={t} style={{marginTop:12}}>
        <Lbl t={t}>EXERCISE {ei+1} OF {exs.length}</Lbl>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
          <div onClick={()=>onOpenDemo(ex.exerciseId)} style={{cursor:'pointer'}}><div style={{fontSize:24,fontWeight:900,marginBottom:2}}>{ex?.exerciseName} <span style={{fontSize:12,color:t.blue}}>ⓘ</span></div><div style={{fontSize:11,color:t.txt2,marginBottom:2}}>{performedDef?.primaryMuscles.join(', ') ?? exDef?.primaryMuscles.join(', ')}</div></div>
          {prVal!=null && <div style={{fontSize:10,color:t.gold,textAlign:'right'}}>🏆 PR<br/>{prVal}</div>}
        </div>
        {ex.adjustmentReason && <div style={{fontSize:10,color:t.blue,marginBottom:8}}>🧠 {ex.adjustmentReason}</div>}
        <div style={{display:'flex',gap:5,marginBottom:3}}>{Array.from({length:ex?.sets||1},(_,i)=><div key={i} style={{width:9,height:9,borderRadius:5,background:i<si?t.blue:i===si?t.txt:t.border}}/>)}</div>
        <div style={{fontSize:10,color:t.txt2,letterSpacing:1,marginBottom:16}}>Set {si+1} of {ex?.sets}</div>

        {phase==='intro' && (<div style={{textAlign:'center'}}>
          <div style={{fontSize:26,fontWeight:900,color:t.blue,marginBottom:8}}>{isTimed?`${activeTargetDuration}s`:activeTargetReps==='max'?'MAX REPS':`${activeTargetReps} REPS`}</div>
          {ex.targetReps==='max' && lastValue!=null && lastValue>0 && <div style={{fontSize:11,color:t.blue,marginBottom:10}}>🎯 Last time: {lastValue}{isTimed?'s':' reps'} — beat it</div>}
          {exDef?.breathingCue && <div style={{fontSize:11,color:t.txt2,marginBottom:14}}>💨 {exDef.breathingCue}</div>}
          <Btn t={t} onClick={startWork}>{isTimed?'▶ START TIMER':'▶ GO'}</Btn>
          {exDef?.regressionId && !useMod[ei] && <div style={{fontSize:11,color:t.gold,textAlign:'center',marginTop:10,cursor:'pointer'}} onClick={()=>setUseMod(m=>({...m,[ei]:true}))}>Can't do it? Use easier variation →</div>}
          {useMod[ei] && exDef?.regressionId && <div style={{fontSize:11,color:t.gold,marginTop:10}}>🔄 Performing: {EXERCISE_REGISTRY[exDef.regressionId]?.name ?? 'easier variation'}</div>}
        </div>)}

        {phase==='work' && isTimed && (<div style={{textAlign:'center'}}>
          <div style={{fontSize:56,fontWeight:900,letterSpacing:-3,color:timer<=10?t.red:t.txt}}>{fmt(timer)}</div>
          <div style={{fontSize:11,color:t.txt2,marginBottom:14}}>Hold strong!</div>
          <Btn t={t} variant='secondary' onClick={()=>{if(ref.current)clearInterval(ref.current);setRunning(false);audio.done();logSet('good');}}>Done early</Btn>
        </div>)}

        {phase==='work' && !isTimed && (<div style={{textAlign:'center'}}>
          <div style={{fontSize:18,fontWeight:700,color:t.blue,marginBottom:14}}>{ex.targetReps==='max'?'DO YOUR MAX':`DO ${ex.targetReps} REPS`}</div>
          <Lbl t={t} color={t.txt2}>TAP TO COUNT</Lbl>
          <button onClick={()=>{setTapCount(n=>n+1);haptic([20]);}} style={{width:88,height:88,borderRadius:44,background:`linear-gradient(135deg,${t.blue},${t.blueDk})`,border:'none',cursor:'pointer',fontSize:30,fontWeight:900,color:'#fff',boxShadow:`0 0 24px ${t.blueGlow}`,fontFamily:FONT,marginBottom:4}}>{tapCount}</button>
          <div style={{fontSize:10,color:t.txt2,marginBottom:10}}>reps - or type below</div>
          <input style={{background:t.surface2,border:`1px solid ${t.border}`,borderRadius:8,color:t.txt,fontSize:22,fontWeight:900,padding:'8px 12px',textAlign:'center',width:'100%',fontFamily:FONT,boxSizing:'border-box',marginBottom:10}} type='number' placeholder='Type reps...' value={repInput} onChange={e=>setRepInput(e.target.value)}/>
          <div style={{display:'flex',gap:6,justifyContent:'center'}}>{['easy','good','hard','failed'].map(tag => <button key={tag} onClick={()=>logSet(tag)} style={{background:'transparent',border:`1px solid ${t.border}`,borderRadius:6,color:t.txt2,fontSize:9,padding:'6px 10px',cursor:'pointer',fontFamily:FONT,fontWeight:700,letterSpacing:1}}>{tag.toUpperCase()}</button>)}</div>
        </div>)}

        {phase==='rest' && (<div style={{textAlign:'center'}}>
          <div style={{fontSize:10,color:t.gold,letterSpacing:3,marginBottom:4}}>REST</div>
          <div style={{fontSize:56,fontWeight:900,letterSpacing:-3,color:timer<=10?t.green:t.txt}}>{fmt(timer)}</div>
          <div style={{fontSize:10,color:t.txt2,marginBottom:14}}>{REST}s rest</div>
          <Btn t={t} variant='secondary' onClick={()=>{if(ref.current)clearInterval(ref.current);setRunning(false);advance();}}>Skip →</Btn>
        </div>)}
      </Card>

      {exDef && exDef.tips.length>0 && (<div style={{background:t.isDark?'#08101E':'#EBF4FF',border:`1px solid ${t.blue}18`,borderRadius:10,padding:12,cursor:'pointer'}} onClick={()=>setTipIdx(i=>i+1)}>
        <div style={{fontSize:9,color:t.blue,letterSpacing:2,marginBottom:5}}>💡 TIP <span style={{color:t.txt3,fontSize:8}}>(tap for next)</span></div>
        <div style={{fontSize:12,color:t.txt2,lineHeight:1.5}}>{exDef.tips[tipIdx % exDef.tips.length]}</div>
      </div>)}
    </Scr>
  );
};

const SummaryView: React.FC<{t:Theme;dayNum:number;exerciseLogs:any[];newPRs:Record<string,number>;onSave:(note:string)=>void;onBack:()=>void}> = ({t,dayNum,exerciseLogs,newPRs,onSave,onBack}) => {
  const [note,setNote]=useState('');
  const total = exerciseLogs.reduce((a,e) => a + (e.repsPerSet?.reduce((x:number,y:number)=>x+y,0) ?? 0), 0);
  const prList = Object.entries(newPRs);
  return (
    <Scr t={t}>
      <div style={{textAlign:'center',marginBottom:20}}><div style={{fontSize:56,marginBottom:6}}>🏆</div><div style={{fontSize:28,fontWeight:900,letterSpacing:-1,background:`linear-gradient(135deg,${t.blueLt},${t.blueDk})`,WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>CRUSHED IT</div><div style={{color:t.blue,fontSize:11,letterSpacing:2,marginTop:4}}>DAY {dayNum} COMPLETE</div></div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:14}}><StatBox t={t} label='EXERCISES' value={exerciseLogs.length}/><StatBox t={t} label='TOTAL REPS' value={total}/><StatBox t={t} label='NEW PRs' value={prList.length} color={t.gold}/></div>
      {prList.length>0 && <Card t={t} style={{background:t.isDark?'#0F0E00':'#FFFBE6',borderColor:`${t.gold}44`}}><Lbl t={t} color={t.gold}>🏆 NEW PERSONAL RECORDS</Lbl>{prList.map(([n,v]) => <div key={n} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:`1px solid ${t.isDark?'#1A1400':'#FFE58F'}`,fontSize:12}}><span style={{color:t.txt2}}>{n}</span><span style={{color:t.gold,fontWeight:700}}>★ {v}</span></div>)}</Card>}
      <Lbl t={t}>WORKOUT NOTE (optional)</Lbl>
      <textarea style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:10,color:t.txt,fontSize:12,padding:10,width:'100%',boxSizing:'border-box',fontFamily:FONT,resize:'none',height:72,marginBottom:12}} placeholder='How did it feel?' value={note} onChange={e=>setNote(e.target.value)}/>
      <Btn t={t} onClick={()=>onSave(note)}>SAVE & FINISH</Btn>
      <Btn t={t} variant='ghost' style={{display:'block',margin:'8px auto 0',fontSize:11}} onClick={onBack}>Exit without saving</Btn>
    </Scr>
  );
};

const MilestoneView: React.FC<{t:Theme;day:number;onContinue:()=>void}> = ({t,day,onContinue}) => {
  const [pulse,setPulse]=useState(false);
  const audio = useAudio();
  useEffect(() => { audio.milestone(); haptic([100,50,100,50,200]); const i=setInterval(()=>setPulse(p=>!p),900); return ()=>clearInterval(i); }, []);
  return (
    <Scr t={t} style={{justifyContent:'center',alignItems:'center',textAlign:'center',position:'relative'}}>
      <div style={{position:'absolute',inset:0,background:`radial-gradient(circle at 50% 40%,${t.blue}18 0%,transparent 65%)`,pointerEvents:'none'}}/>
      <div style={{fontSize:64,transform:pulse?'scale(1.1)':'scale(1)',transition:'transform 0.5s',marginBottom:12}}>🔥</div>
      <div style={{fontSize:11,color:t.blue,letterSpacing:4,marginBottom:6}}>MILESTONE UNLOCKED</div>
      <div style={{fontSize:64,fontWeight:900,letterSpacing:-3,background:`linear-gradient(135deg,${t.blueLt},${t.blueDk})`,WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>{day}</div>
      <div style={{fontSize:11,color:t.txt2,letterSpacing:2,marginBottom:6}}>DAYS DONE</div>
      <div style={{fontSize:13,color:t.txt,maxWidth:280,lineHeight:1.6,margin:'14px auto 24px'}}>{MILESTONES[day] ?? `Day ${day} complete.`}</div>
      <Btn t={t} onClick={onContinue}>KEEP GOING →</Btn>
    </Scr>
  );
};

const ProgressView: React.FC<{t:Theme;store:ReturnType<typeof useStore>;onBack:()=>void;onPhotos:()=>void}> = ({t,store,onBack,onPhotos}) => {
  const [tab,setTab]=useState<'stats'|'ai'|'analytics'|'gamification'>('stats');
  const done = store.training.totalWorkoutsCompleted;
  const rate = store.transformation?.consistencyIndex ?? 0;

  return (
    <Scr t={t}>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}><Btn t={t} variant='ghost' onClick={onBack}>← Back</Btn><div style={{fontSize:14,fontWeight:900,letterSpacing:2}}>PROGRESS</div></div><Btn t={t} variant='secondary' onClick={onPhotos} style={{marginBottom:12}}>📷 PROGRESS PHOTOS · {store.data.progressPhotos?.length ?? 0}</Btn>
      <div style={{display:'flex',gap:4,marginBottom:16,background:t.surface2,borderRadius:10,padding:3,overflowX:'auto'}}>{(['stats','ai','analytics','gamification'] as const).map(tb => <button key={tb} onClick={()=>setTab(tb)} style={{flex:'1 0 auto',padding:'7px 6px',borderRadius:8,border:'none',background:tab===tb?t.blue:'transparent',color:tab===tb?'#fff':t.txt2,fontSize:9,fontWeight:700,letterSpacing:1,cursor:'pointer',fontFamily:FONT,whiteSpace:'nowrap'}}>{tb.toUpperCase()}</button>)}</div>

      {tab==='stats' && (<>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:16}}><StatBox t={t} label='WORKOUTS' value={done}/><StatBox t={t} label='CONSIST.' value={`${rate}%`}/><StatBox t={t} label='DAY' value={store.training.calendarDay}/></div>
        {store.transformation && <ScoreCard t={t} transformation={store.transformation}/>}
        {store.prs.length>0 && <><Lbl t={t} color={t.blue}>PERSONAL RECORDS 🏆</Lbl><Card t={t} style={{background:t.isDark?'#0F0E00':'#FFFBE6',borderColor:`${t.gold}33`,padding:'12px 14px'}}>{store.prs.map(p => <div key={p.exerciseId} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:`1px solid ${t.isDark?'#1A1400':'#FFE58F'}`,fontSize:12}}><span style={{color:t.txt2}}>{p.exerciseName}</span><span style={{color:t.gold,fontWeight:700}}>★ {p.value}</span></div>)}</Card></>}
        <Btn t={t} variant='secondary' onClick={store.exportData}>⬇ EXPORT DATA</Btn>
      </>)}

      {tab==='ai' && store.ai && <AICoachCard t={t} insights={store.ai.insights} adjustments={store.ai.nextWorkoutAdjustments} weakGroups={store.ai.weakMuscleGroups} adaptation={store.adaptation ?? null} onDismiss={store.dismissInsight} onOverride={store.overrideAdjustment}/>}
      {tab==='analytics' && store.analytics && <AnalyticsCharts t={t} analytics={store.analytics}/>}
      {tab==='gamification' && <GamificationCard t={t} gamification={store.gamification}/>}
    </Scr>
  );
};

const CalendarView: React.FC<{t:Theme;store:ReturnType<typeof useStore>;onBack:()=>void}> = ({t,store,onBack}) => {
  const [sel,setSel]=useState<number|null>(null);
  const selSession = sel ? store.sessions.find(s=>s.calendarDay===sel) : null;
  const maxDay = Math.max(store.training.calendarDay, 90);
  return (
    <Scr t={t}>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}><Btn t={t} variant='ghost' onClick={onBack}>← Back</Btn><div style={{fontSize:14,fontWeight:900,letterSpacing:2}}>CALENDAR</div></div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(10,1fr)',gap:3,marginBottom:14}}>
        {Array.from({length:maxDay},(_,i) => { const d=i+1; const session=store.sessions.find(s=>s.calendarDay===d); const today=d===store.training.calendarDay; const future=d>store.training.calendarDay;
          return <div key={d} onClick={()=>setSel(d)} style={{aspectRatio:'1',borderRadius:4,cursor:'pointer',border:today?`1px solid ${t.blue}`:session?`1px solid ${t.blue}33`:`1px solid ${t.border}`,background:today?`${t.blue}22`:session?`${t.blue}15`:'transparent',opacity:future?0.3:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}><div style={{fontSize:8,color:today?t.blue:session?t.blue:t.txt3}}>{d}</div>{session && !session.isRestDay && <div style={{fontSize:6,color:t.blue}}>✓</div>}{session?.isRestDay && <div style={{fontSize:6}}>💤</div>}</div>;
        })}
      </div>
      {sel && (<Card t={t}><div style={{fontWeight:700,marginBottom:10,fontSize:13}}>Day {sel}{selSession ? ` - ${selSession.focus}` : ''}</div>
        {selSession ? (selSession.isRestDay ? <div style={{color:t.txt2,fontSize:12}}>Recovery day</div> : selSession.exercises.map((e:any,i:number) => <ExRow key={i} t={t} name={e.exerciseName} sets={e.sets} reps={e.repsPerSet?.[0]??0} type={e.type}/>))
        : <div style={{fontSize:11,color:t.red}}>⚠️ Not completed</div>}
        {selSession?.note && <div style={{marginTop:10,padding:'8px 10px',background:t.surface2,borderRadius:7,fontSize:11,color:t.txt2}}>📝 "{selSession.note}"</div>}
      </Card>)}
    </Scr>
  );
};

const LibraryView: React.FC<{t:Theme;onBack:()=>void;onOpenDemo:(id:string)=>void}> = ({t,onBack,onOpenDemo}) => {
  const [q,setQ]=useState('');
  const names = Object.values(EXERCISE_REGISTRY).filter(e => e.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <Scr t={t}>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}><Btn t={t} variant='ghost' onClick={onBack}>← Back</Btn><div style={{fontSize:14,fontWeight:900,letterSpacing:2}}>EXERCISES</div></div>
      <input style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:9,color:t.txt,fontSize:13,padding:'9px 12px',width:'100%',boxSizing:'border-box',fontFamily:FONT,marginBottom:10}} placeholder='Search exercises...' value={q} onChange={e=>setQ(e.target.value)}/>
      {names.map(ex => <div key={ex.id} onClick={()=>onOpenDemo(ex.id)} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'11px 0',borderBottom:`1px solid ${t.border}`,cursor:'pointer'}}><div><div style={{fontSize:13,fontWeight:600}}>{ex.name}</div><div style={{fontSize:10,color:t.txt2,marginTop:2}}>{ex.primaryMuscles.join(', ')} · Difficulty {ex.difficulty}/10</div></div><span style={{color:t.blue,fontSize:16}}>›</span></div>)}
    </Scr>
  );
};

const AthleteView: React.FC<{t:Theme;store:ReturnType<typeof useStore>;onBack:()=>void}> = ({t,store,onBack}) => {
  const am = store.athleteModel;
  const masteredExercises = Object.values(am.exerciseMastery).filter(m=>m.mastered);
  const readyExercises = Object.values(am.exerciseMastery).filter(m=>m.readyForProgression && !m.mastered);
  return (
    <Scr t={t}>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}><Btn t={t} variant='ghost' onClick={onBack}>← Back</Btn><div style={{fontSize:14,fontWeight:900,letterSpacing:2}}>ATHLETE MODEL</div></div>
      <Lbl t={t} color={t.blue}>PROFILE</Lbl>
      <Card t={t} style={{padding:'12px 14px'}}>
        {[['Level',am.currentLevel],['Training Age',`${am.trainingAgeDays} days`],['Progression Velocity',`${(am.progressionVelocity*100).toFixed(0)}%`],['Recovery Rate',`${(am.recoveryRate*100).toFixed(0)}%`]].map(([k,v]) => <div key={k as string} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:`1px solid ${t.border}`,fontSize:12}}><span style={{color:t.txt}}>{k}</span><span style={{color:t.blue,textTransform:'capitalize'}}>{v}</span></div>)}
      </Card>

      <Lbl t={t} color={t.blue}>MUSCLE BALANCE</Lbl>
      <Card t={t} style={{padding:'12px 14px'}}>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:8}}><span style={{color:t.txt}}>Overall Balance</span><span style={{color:t.green}}>{Math.round(am.muscleBalance.overallBalance*100)}%</span></div>
        {(['push','pull','legs','core'] as const).map(g => <div key={g} style={{display:'flex',justifyContent:'space-between',fontSize:11,color:t.txt2,padding:'4px 0'}}><span style={{textTransform:'capitalize'}}>{g}</span><span>{am.muscleBalance[g]}</span></div>)}
      </Card>

      {am.weakPoints.length>0 && <Card t={t} style={{background:t.isDark?'#1A0A00':'#FFF4E6',borderColor:`${t.gold}33`}}><Lbl t={t} color={t.gold}>WEAK POINTS</Lbl><div style={{fontSize:12,color:t.txt2}}>{am.weakPoints.join(', ')}</div></Card>}
      {am.strongPoints.length>0 && <Card t={t} style={{background:t.isDark?'#0A1A0A':'#E8F8E8',borderColor:`${t.green}33`}}><Lbl t={t} color={t.green}>STRONG POINTS</Lbl><div style={{fontSize:12,color:t.txt2}}>{am.strongPoints.join(', ')}</div></Card>}

      {readyExercises.length>0 && <><Lbl t={t} color={t.blue}>READY TO PROGRESS</Lbl><Card t={t}>{readyExercises.map(m => <div key={m.exerciseId} style={{padding:'6px 0',borderBottom:`1px solid ${t.border}`,fontSize:12,color:t.txt}}>{m.exerciseName} - {m.sessionsCompleted} sessions</div>)}</Card></>}

      {masteredExercises.length>0 && <><Lbl t={t} color={t.gold}>MASTERED SKILLS 🏆</Lbl><Card t={t} style={{background:t.isDark?'#0F0E00':'#FFFBE6',borderColor:`${t.gold}33`}}>{masteredExercises.map(m => <div key={m.exerciseId} style={{padding:'6px 0',borderBottom:`1px solid ${t.isDark?'#1A1400':'#FFE58F'}`,fontSize:12,color:t.txt}}>🏅 {m.exerciseName}</div>)}</Card></>}

      <Lbl t={t} color={t.blue}>AI MEMORY</Lbl>
      <Card t={t} style={{padding:'12px 14px'}}>
        <div style={{fontSize:11,color:t.txt2,marginBottom:8}}>{store.aiMemory.decisions.length} decisions recorded</div>
        {store.aiMemory.patterns.slice(0,5).map((p,i) => <div key={i} style={{display:'flex',justifyContent:'space-between',fontSize:11,padding:'4px 0',color:t.txt2}}><span>{p.pattern}</span><span>{Math.round(p.successRate*100)}% success</span></div>)}
      </Card>
    </Scr>
  );
};

const SettingsView: React.FC<{t:Theme;store:ReturnType<typeof useStore>;onBack:()=>void}> = ({t,store,onBack}) => {
  const [s,setS]=useState(store.profile.settings);
  const [sd,setSd]=useState(store.profile.startDate);
  const upd = (k:string,v:any) => setS(prev=>({...prev,[k]:v}));
  return (
    <Scr t={t}>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}><Btn t={t} variant='ghost' onClick={onBack}>← Back</Btn><div style={{fontSize:14,fontWeight:900,letterSpacing:2}}>SETTINGS</div></div>
      <Lbl t={t} color={t.blue}>PROGRAM</Lbl>
      <Card t={t} style={{padding:'12px 14px'}}>
        <div style={{padding:'8px 0',borderBottom:`1px solid ${t.border}`}}><div style={{fontSize:11,color:t.txt2,marginBottom:6}}>START DATE</div><input type='date' value={sd} onChange={e=>setSd(e.target.value)} style={{background:t.surface2,border:`1px solid ${t.border}`,borderRadius:8,color:t.txt,fontSize:13,padding:'8px 10px',width:'100%',fontFamily:FONT,boxSizing:'border-box'}}/></div>
        <div style={{display:'flex',justifyContent:'space-between',padding:'8px 0',fontSize:12}}><span style={{color:t.txt}}>Theme</span><span style={{color:t.blue}}>Follows system ({t.isDark?'Dark':'Light'})</span></div>
      </Card>
      <Lbl t={t} color={t.blue}>WORKOUT</Lbl>
      <Card t={t} style={{padding:'12px 14px'}}>
        <div style={{padding:'8px 0',borderBottom:`1px solid ${t.border}`}}><div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:7}}><span>Default Rest Time</span><span style={{color:t.blue}}>{s.restTime}s</span></div><input type='range' min={30} max={120} step={15} value={s.restTime} onChange={e=>upd('restTime',Number(e.target.value))} style={{width:'100%',accentColor:t.blue}}/></div>
        <Toggle t={t} label='Haptic Feedback' value={s.haptics} onChange={v=>upd('haptics',v)}/>
        <Toggle t={t} label='Audio Cues' value={s.audio} onChange={v=>upd('audio',v)}/>
      </Card>
      <Lbl t={t} color={t.blue}>AI ASSISTANT</Lbl>
      <Card t={t} style={{padding:'12px 14px'}}>
        <Toggle t={t} label='Chat Assistant Enabled' value={s.chatEnabled} onChange={v=>upd('chatEnabled',v)}/>
        <Toggle t={t} label='Floating Chat Button' value={s.floatingChatVisible} onChange={v=>upd('floatingChatVisible',v)}/>
      </Card>
      <Lbl t={t} color={t.blue}>APPEARANCE</Lbl>
      <Card t={t} style={{padding:'12px 14px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0'}}><span style={{fontSize:12}}>Font Size</span><div style={{display:'flex',gap:5}}>{['normal','large'].map(f => <button key={f} onClick={()=>upd('fontSize',f)} style={{padding:'3px 10px',borderRadius:6,background:s.fontSize===f?t.blue:t.surface2,border:`1px solid ${t.border}`,color:s.fontSize===f?'#fff':t.txt2,fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:FONT}}>{f.toUpperCase()}</button>)}</div></div>
      </Card>
      <Lbl t={t} color={t.blue}>NOTIFICATIONS</Lbl>
      <Card t={t} style={{padding:'12px 14px'}}>
        <div style={{padding:'8px 0',borderBottom:`1px solid ${t.border}`}}><div style={{fontSize:11,color:t.txt2,marginBottom:6}}>DAILY REMINDER</div><input type='time' value={s.notifTime} onChange={e=>{upd('notifTime',e.target.value);scheduleWorkoutReminder(e.target.value);}} style={{background:t.surface2,border:`1px solid ${t.border}`,borderRadius:8,color:t.txt,fontSize:13,padding:'8px 10px',fontFamily:FONT}}/></div>
        <Toggle t={t} label='Streak Alert' value={s.streakAlert} onChange={v=>upd('streakAlert',v)}/>
      </Card>
      <Btn t={t} onClick={()=>{store.updateProfile({startDate:sd,settings:s});}}>SAVE SETTINGS</Btn>
      <Btn t={t} variant='danger' style={{marginTop:8}} onClick={()=>{if(window.confirm('Reset all data? This cannot be undone.'))store.resetStore();}}>⚠ RESET ALL DATA</Btn>
    </Scr>
  );
};
