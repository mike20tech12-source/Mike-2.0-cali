import React, { useState, useEffect, useRef } from 'react';

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface Theme {
  bg: string; surface: string; surface2: string;
  border: string; borderHi: string;
  blue: string; blueLt: string; blueDk: string; blueGlow: string;
  gold: string; green: string; red: string;
  txt: string; txt2: string; txt3: string; isDark: boolean;
}
interface Exercise { name: string; sets: number; reps: number | string; type: 'reps' | 'timed'; }
interface Plan { focus: string; exercises: Exercise[]; isRest: boolean; warmupType: string; isDeload?: boolean; }
interface ExerciseInfo { muscle: string; tips: string[]; mod: string; breathe: string; }
interface LogEntry { date: string; repsLog: Record<string, number>; note: string; }
interface AppData {
  logs?: Record<number, LogEntry>;
  prs?: Record<string, number>;
  settings?: Settings;
  startDate?: string;
  onboarded?: boolean;
}
interface Settings {
  restTime: number; haptics: boolean; audio: boolean;
  notifTime: string; fontSize: string; streakAlert: boolean;
}
interface Checkin { energy: number; soreness: number; }
interface TimedItem { name: string; duration: number; desc: string; }

// ─── SYSTEM THEME ─────────────────────────────────────────────────────────────
function useSystemTheme(): boolean {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const [dark, setDark] = useState<boolean>(mq.matches);
  useEffect(() => {
    const h = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);
  return dark;
}

// ─── THEMES ───────────────────────────────────────────────────────────────────
const DARK: Theme = {
  bg:'#0D0D2B', surface:'#13134A', surface2:'#1A1A5A',
  border:'#2A2A6A', borderHi:'#3BA5FF55',
  blue:'#3BA5FF', blueLt:'#00CFFF', blueDk:'#1E90FF', blueGlow:'#3BA5FF15',
  gold:'#FFD700', green:'#00FF88', red:'#FF5555',
  txt:'#FFFFFF', txt2:'#8B9DB0', txt3:'#3A4A6A', isDark:true,
};
const LIGHT: Theme = {
  bg:'#EEF4FF', surface:'#FFFFFF', surface2:'#E0EAFF',
  border:'#C8D8F0', borderHi:'#3BA5FF66',
  blue:'#1E7FE8', blueLt:'#00AADD', blueDk:'#0057D9', blueGlow:'#1E7FE810',
  gold:'#C8800A', green:'#00A855', red:'#DD2222',
  txt:'#0A0A2A', txt2:'#5A6A8A', txt3:'#9AAAC0', isDark:false,
};

// ─── EXERCISE DB ──────────────────────────────────────────────────────────────
const DB: Record<string, ExerciseInfo> = {
  'Pull-ups':               {muscle:'Back, Biceps',           tips:['Dead hang first — fully extend at bottom','Drive elbows DOWN not back','Squeeze shoulder blades at top','Control the negative — 3 seconds down'],               mod:'Jump to top, lower slowly (negatives)',   breathe:'Exhale pulling up, inhale lowering'},
  'Chin-ups':               {muscle:'Biceps, Back',           tips:['Supinated grip shoulder-width','Lead with chest, not chin','Full extension at bottom each rep','Keep core tight throughout'],                                    mod:'Assisted with resistance band',           breathe:'Exhale pulling up, inhale lowering'},
  'Backpack rows':          {muscle:'Upper Back, Rear Delts', tips:['Load backpack with books','Keep back flat — no rounding','Pull to lower chest/upper abs','Pause 1 second at top'],                                              mod:'Use lighter load or bodyweight only',     breathe:'Exhale on the pull, inhale releasing'},
  'Dead hangs':             {muscle:'Grip, Decompression',    tips:['Relax shoulders fully','Focus on grip and breathing','Slightly engage core to protect back','Build to 60s+ over weeks'],                                         mod:'Use chair for partial weight support',    breathe:'Deep belly breaths throughout'},
  'Hanging leg raises':     {muscle:'Lower Abs, Hip Flexors', tips:['No swinging — control the movement','Tilt pelvis backward at top','Lower slowly — 3 seconds down','Keep legs straight for full difficulty'],                    mod:'Bent-knee raises instead',               breathe:'Exhale raising legs, inhale lowering'},
  'Squats':                 {muscle:'Quads, Glutes, Hamstrings',tips:['Feet shoulder-width, toes slightly out','Break at hips and knees simultaneously','Keep chest tall, don\'t lean forward','Drive knees out over toes'],         mod:'Sit to chair and stand',                 breathe:'Inhale going down, exhale driving up'},
  'Jump squats':            {muscle:'Quads, Glutes, Power',   tips:['Land softly — toe-heel-heel','Immediately descend on landing','Arms drive up for extra height','Land with slight knee bend'],                                    mod:'Regular squats with fast tempo',         breathe:'Exhale explosively on the jump'},
  'Bulgarian split squats': {muscle:'Quads, Glutes, Balance', tips:['Rear foot elevated on chair/bed','Front foot far forward — knee behind toes','Drop straight down, not forward','Drive through front heel to stand'],            mod:'Regular reverse lunges',                 breathe:'Inhale descending, exhale rising'},
  'Wall sit':               {muscle:'Quads, Isometric',       tips:['90° at knees — thighs parallel to floor','Back flat against wall the whole time','Don\'t rest hands on thighs','Focus on slow controlled breathing'],           mod:'Higher angle (less than 90°)',           breathe:'Deep rhythmic breaths, stay calm'},
  'Mountain climbers':      {muscle:'Core, Cardio, Shoulders',tips:['Hips level — don\'t let them rise','Fast but controlled knee drives','Keep arms straight, shoulders over wrists','Core braced the entire time'],                mod:'Slow mountain climbers',                 breathe:'Rhythmic — exhale each knee drive'},
  'Decline push-ups':       {muscle:'Upper Chest, Front Delts',tips:['Feet elevated on chair/bed','Keep body in straight line','Elbows at 45° not flared wide','Lower chest toward floor, not face'],                               mod:'Standard push-ups',                      breathe:'Inhale lowering, exhale pressing'},
  'Pike push-ups':          {muscle:'Shoulders, Triceps',     tips:['Inverted V position — hips high','Lower head between hands toward floor','Keep arms straight until you lower','Builds toward handstand push-ups'],               mod:'Elevated pike (hands on chair)',          breathe:'Inhale down, exhale press'},
  'Chair dips':             {muscle:'Triceps, Chest',         tips:['Hands grip edge of sturdy chair','Lower until upper arms parallel to floor','Keep elbows pointing back, not flared','Straighten arms fully at top'],             mod:'Reduce range of motion',                 breathe:'Inhale dipping, exhale pressing up'},
  'Diamond push-ups':       {muscle:'Triceps, Inner Chest',   tips:['Hands form a diamond shape under chest','Elbows track back along your sides','Keep hips level — don\'t sag','Slower tempo = more tricep burn'],                mod:'Hands slightly wider if wrists hurt',    breathe:'Inhale lowering, exhale pressing'},
  'Plank':                  {muscle:'Core, Shoulders, Glutes',tips:['Straight line from head to heels','Squeeze glutes and quads hard','Don\'t let hips sag or pike up','Gaze slightly ahead of hands'],                           mod:'Knee plank',                             breathe:'Slow controlled breaths, never hold'},
  'Negative pull-ups':      {muscle:'Back, Biceps (eccentric)',tips:['Jump or step to top position','Lower as slowly as possible — aim 5-8s','Full extension at bottom before dropping','Fastest way to build pull-up strength'],    mod:'3-second negatives to start',            breathe:'Inhale slowly as you lower'},
  'Hollow hold':            {muscle:'Core, Hip Flexors',      tips:['Lower back pressed INTO floor — key','Arms overhead, legs extended and raised','If lower back lifts, tuck knees in','Body forms a banana/boat shape'],          mod:'Arms by sides or knees tucked',          breathe:'Exhale fully, maintain core brace'},
  'Burpees':                {muscle:'Full Body, Cardio',      tips:['Chest must touch floor each rep','Explosive jump with arms overhead','Keep a steady rhythm over speed','Breathe — never hold your breath'],                     mod:'Step back/forward instead of jumping',   breathe:'Exhale on jump, inhale dropping down'},
  'Hanging knee raises':    {muscle:'Lower Abs, Hip Flexors', tips:['Control the swing completely','Tuck knees to chest at top','Lower slowly — resist gravity','Progress to straight leg raises'],                                  mod:'Small range raises to start',            breathe:'Exhale raising knees, inhale lowering'},
  'Push-ups':               {muscle:'Chest, Triceps, Shoulders',tips:['Hands just outside shoulder width','Elbows at 45° angle to body','Full range — chest nearly touches floor','Squeeze chest at the top'],                     mod:'Knee push-ups',                          breathe:'Inhale down, exhale up'},
  'Jump lunges':            {muscle:'Quads, Glutes, Power',   tips:['Switch legs in the air','Land softly in split stance','Keep torso upright throughout','Drive back knee toward floor'],                                          mod:'Alternating reverse lunges',             breathe:'Exhale on the explosive jump'},
  'Archer push-ups':        {muscle:'Chest, Triceps (unilateral)',tips:['Wide stance, one arm straight as you shift','Working arm does full push-up','Extended arm stays straight as support','Progress toward one-arm push-up'],   mod:'Stay wider, less weight shift',          breathe:'Inhale shifting down, exhale pressing'},
  'Explosive pull-ups':     {muscle:'Back, Biceps, Fast Twitch',tips:['Dead hang start every rep','Pull explosively — aim chest to bar','Control the negative slowly','Quality over quantity every rep'],                           mod:'Fast regular pull-ups',                  breathe:'Exhale explosively on the pull'},
  'Clap push-ups':          {muscle:'Chest, Explosive Power', tips:['Push explosively off the floor','Clap hands quickly at the top','Land with arms slightly bent — never locked','Build on regular push-up base first'],           mod:'Push hard without clapping first',       breathe:'Exhale explosively off the floor'},
  'Chest-to-bar pull-ups':  {muscle:'Full Back, Biceps',      tips:['Lean back slightly for chest contact','Full dead hang start every rep','Drive elbows down and back hard','Requires serious lat strength'],                     mod:'High pull-ups (chin well above bar)',    breathe:'Exhale driving up, inhale lowering'},
  'Pseudo planche push-ups':{muscle:'Chest, Shoulders, Core', tips:['Hands pointing back beside hips','Lean forward until shoulders over hands','Body stays rigid like a board','Start with less lean, build over weeks'],          mod:'Standard push-ups with forward lean',   breathe:'Inhale lowering, exhale pressing'},
  'L-sit progression':      {muscle:'Core, Hip Flexors, Triceps',tips:['Between two chairs — press down hard','Elevate hips first, then extend one leg','Hold 5s then build to 30s over weeks','Tuck first then gradually straighten'],mod:'Tuck L-sit with both knees bent',      breathe:'Exhale and brace core hard'},
  'Handstand wall holds':   {muscle:'Shoulders, Core, Balance',tips:['Kick up to wall with control','Stack wrists, elbows, shoulders in line','Look between hands — slightly forward','Squeeze glutes to keep hips over hands'],    mod:'Pike hold with feet on wall (face wall)',breathe:'Slow controlled breaths, stay calm'},
  'Typewriter pull-ups':    {muscle:'Unilateral Back, Biceps', tips:['Pull up then shift side to side at top','One arm nearly extends as you move laterally','Return center before lowering','Builds toward one-arm pull-up'],       mod:'Regular wide grip pull-ups',             breathe:'Inhale at dead hang, exhale pulling'},
  'Pistol squat progression':{muscle:'Quads, Glutes, Balance',tips:['Hold pull-up bar for balance assistance','One leg extended forward, squat on other','Drive through heel, not toes','Build depth week by week'],                mod:'Assisted pistol holding bar',            breathe:'Inhale descending, exhale driving up'},
  'Dips':                   {muscle:'Triceps, Chest, Shoulders',tips:['Use two sturdy chairs or parallel bars','Lower until 90° at elbows','Lean slightly forward for more chest','Full lockout at top'],                          mod:'Chair dips',                             breathe:'Inhale dipping, exhale pressing'},
};

// ─── SEQUENCES ────────────────────────────────────────────────────────────────
const WARMUP_UPPER: TimedItem[] = [
  {name:'Arm circles',       duration:30, desc:'Big circles forward then back — loosen the shoulders'},
  {name:'Scapular pull-ups', duration:20, desc:'Hang on bar, shrug shoulders up and down — activate the back'},
  {name:'Shoulder rolls',    duration:20, desc:'Slow big rolls forward then backward'},
  {name:'Wrist circles',     duration:20, desc:'Full circles each direction — prep for pushing'},
  {name:'Jumping jacks',     duration:30, desc:'Light and easy — just get the blood moving'},
];
const WARMUP_LOWER: TimedItem[] = [
  {name:'Hip circles',       duration:20, desc:'Hands on hips, big circles each direction'},
  {name:'Leg swings',        duration:25, desc:'Hold bar, swing each leg forward and back'},
  {name:'Ankle circles',     duration:20, desc:'Full circles each direction — prep for jumping'},
  {name:'Bodyweight squats', duration:30, desc:'Slow controlled squats — just warming up'},
  {name:'Jumping jacks',     duration:30, desc:'Light and easy — get the heart rate up'},
];
const WARMUP_FULL: TimedItem[] = [
  {name:'Jumping jacks',     duration:30, desc:'Light and easy — get the blood moving'},
  {name:'Arm circles',       duration:20, desc:'Big circles forward then back — loosen shoulders'},
  {name:'Hip circles',       duration:20, desc:'Hands on hips, big circles each direction'},
  {name:'Bodyweight squats', duration:25, desc:'Slow controlled squats'},
  {name:'Scapular pull-ups', duration:20, desc:'Hang on bar, shrug shoulders up and down'},
];
const COOLDOWN: TimedItem[] = [
  {name:'Chest doorframe stretch', duration:30, desc:'Arm against wall, rotate body away — hold and breathe'},
  {name:"Child's pose",            duration:40, desc:'Kneel, stretch arms forward, breathe into your back'},
  {name:'Lat stretch on bar',      duration:30, desc:'Hang and let one side stretch at a time'},
  {name:'Hip flexor lunge',        duration:35, desc:'Deep lunge each side — squeeze glute of back leg'},
  {name:'Hamstring fold',          duration:30, desc:'Straight-leg forward fold — let gravity do the work'},
  {name:'Shoulder cross stretch',  duration:25, desc:'Pull each arm across chest, hold 10s each side'},
];
const REST_DAY: TimedItem[] = [
  {name:'Cat-cow stretch',      duration:40, desc:'On all fours — arch and round your back slowly'},
  {name:'Pigeon pose (left)',   duration:45, desc:'Deep hip opener — breathe into the stretch'},
  {name:'Pigeon pose (right)',  duration:45, desc:'Switch sides — equal time each'},
  {name:'Thoracic rotation',    duration:30, desc:'Seated, rotate upper body slowly each direction'},
  {name:"Child's pose",         duration:45, desc:'Kneel, stretch arms forward, breathe into your back'},
  {name:'Shoulder cross stretch',duration:30, desc:'Pull each arm across chest, hold 10s each side'},
  {name:'Neck rolls',           duration:25, desc:'Slow gentle circles — never force it'},
  {name:'Standing forward fold',duration:40, desc:'Soft knees, let upper body hang heavy'},
];

// ─── PLAN ─────────────────────────────────────────────────────────────────────
function loadData(): AppData { try { return JSON.parse(localStorage.getItem('mike2v1') || '{}'); } catch { return {}; } }
function saveData(d: AppData): void { try { localStorage.setItem('mike2v1', JSON.stringify(d)); } catch {} }

function getPlan(day: number): Plan {
  const data = loadData();
  const startDate = data.startDate ? new Date(data.startDate) : new Date();
  const d = new Date(startDate); d.setDate(startDate.getDate() + day - 1);
  const dow = d.getDay();
  const rest: Plan = {focus:'Recovery', exercises:[], isRest:true, warmupType:'full'};
  const isDeload = [4,8,12].includes(Math.ceil(day/7));
  function sc(ex: Exercise): Exercise {
    if (!isDeload) return ex;
    return {...ex, sets: Math.max(2, ex.sets-1), reps: ex.reps==='max' ? 'max' : typeof ex.reps==='number' ? Math.floor(ex.reps*0.8) : ex.reps};
  }
  const mk = (focus: string, wt: string, exs: Exercise[]): Plan => ({focus, exercises: exs.map(sc), isRest:false, warmupType:wt, isDeload});

  if (day <= 7) {
    const w: Record<number, Plan> = {
      2: mk('Pull + Core','upper',[{name:'Pull-ups',sets:5,reps:'max',type:'reps'},{name:'Chin-ups',sets:4,reps:10,type:'reps'},{name:'Backpack rows',sets:3,reps:12,type:'reps'},{name:'Dead hangs',sets:3,reps:45,type:'timed'},{name:'Hanging leg raises',sets:4,reps:10,type:'reps'}]),
      3: mk('Legs + Conditioning','lower',[{name:'Squats',sets:4,reps:20,type:'reps'},{name:'Jump squats',sets:4,reps:12,type:'reps'},{name:'Bulgarian split squats',sets:3,reps:10,type:'reps'},{name:'Wall sit',sets:3,reps:60,type:'timed'},{name:'Mountain climbers',sets:3,reps:40,type:'timed'}]),
      4: mk('Push Power','upper',[{name:'Decline push-ups',sets:4,reps:12,type:'reps'},{name:'Pike push-ups',sets:4,reps:10,type:'reps'},{name:'Chair dips',sets:4,reps:12,type:'reps'},{name:'Diamond push-ups',sets:3,reps:10,type:'reps'},{name:'Plank',sets:3,reps:45,type:'timed'}]),
      5: mk('Pull Power','upper',[{name:'Pull-ups',sets:5,reps:'max',type:'reps'},{name:'Negative pull-ups',sets:3,reps:5,type:'reps'},{name:'Chin-ups',sets:4,reps:'max',type:'reps'},{name:'Dead hangs',sets:3,reps:45,type:'timed'},{name:'Hollow hold',sets:3,reps:30,type:'timed'}]),
      6: mk('Athletic Circuit','full',[{name:'Push-ups',sets:5,reps:10,type:'reps'},{name:'Pull-ups',sets:5,reps:10,type:'reps'},{name:'Squats',sets:5,reps:15,type:'reps'},{name:'Burpees',sets:5,reps:10,type:'reps'},{name:'Plank',sets:5,reps:30,type:'timed'}]),
      0: rest,
      1: mk('Push + Abs','upper',[{name:'Push-ups',sets:4,reps:20,type:'reps'},{name:'Decline push-ups',sets:3,reps:12,type:'reps'},{name:'Pike push-ups',sets:4,reps:10,type:'reps'},{name:'Chair dips',sets:4,reps:12,type:'reps'},{name:'Hanging knee raises',sets:3,reps:12,type:'reps'}]),
    };
    return w[dow] ?? rest;
  }
  if (day <= 14) {
    const base = getPlan(day-7);
    if (base.isRest) return rest;
    return {...base, focus: base.focus+' +', exercises: base.exercises.map(e => sc({...e, reps: e.reps==='max'?'max': typeof e.reps==='number'?e.reps+2:e.reps}))};
  }
  if (day <= 28) {
    if (dow===0) return rest;
    const w: Record<number, Plan> = {
      2: mk('Pull Explosive','upper',[{name:'Explosive pull-ups',sets:4,reps:'max',type:'reps'},{name:'Chin-ups',sets:4,reps:12,type:'reps'},{name:'Hanging leg raises',sets:4,reps:12,type:'reps'},{name:'Hollow hold',sets:3,reps:40,type:'timed'}]),
      3: mk('Legs Power','lower',[{name:'Jump squats',sets:4,reps:15,type:'reps'},{name:'Bulgarian split squats',sets:4,reps:12,type:'reps'},{name:'Wall sit',sets:3,reps:75,type:'timed'},{name:'Hanging leg raises',sets:3,reps:12,type:'reps'}]),
      4: mk('Push Harder','upper',[{name:'Archer push-ups',sets:4,reps:8,type:'reps'},{name:'Pike push-ups',sets:4,reps:12,type:'reps'},{name:'Diamond push-ups',sets:4,reps:12,type:'reps'},{name:'Plank',sets:3,reps:60,type:'timed'}]),
      5: mk('Pull Strength','upper',[{name:'Pull-ups',sets:5,reps:'max',type:'reps'},{name:'Negative pull-ups',sets:4,reps:5,type:'reps'},{name:'Backpack rows',sets:4,reps:14,type:'reps'},{name:'Dead hangs',sets:3,reps:60,type:'timed'}]),
      6: mk('Full Body Circuit','full',[{name:'Burpees',sets:5,reps:10,type:'reps'},{name:'Pull-ups',sets:5,reps:'max',type:'reps'},{name:'Push-ups',sets:5,reps:15,type:'reps'},{name:'Mountain climbers',sets:4,reps:40,type:'timed'}]),
      1: mk('Push + Core','upper',[{name:'Archer push-ups',sets:4,reps:10,type:'reps'},{name:'Chair dips',sets:4,reps:15,type:'reps'},{name:'Plank',sets:4,reps:60,type:'timed'},{name:'Hollow hold',sets:3,reps:40,type:'timed'}]),
    };
    return w[dow] ?? rest;
  }
  if (day <= 56) {
    if (dow===0) return rest;
    const w: Record<number, Plan> = {
      1: mk('Push + Abs (W5-8)','upper',[{name:'Archer push-ups',sets:4,reps:10,type:'reps'},{name:'Dips',sets:4,reps:12,type:'reps'},{name:'Pike push-ups',sets:4,reps:12,type:'reps'},{name:'Hanging leg raises',sets:4,reps:15,type:'reps'}]),
      2: mk('Pull + Core (W5-8)','upper',[{name:'Explosive pull-ups',sets:5,reps:'max',type:'reps'},{name:'Chin-ups',sets:4,reps:12,type:'reps'},{name:'Backpack rows',sets:3,reps:15,type:'reps'},{name:'Hollow hold',sets:4,reps:45,type:'timed'}]),
      3: mk('Legs (W5-8)','lower',[{name:'Jump lunges',sets:4,reps:12,type:'reps'},{name:'Bulgarian split squats',sets:4,reps:12,type:'reps'},{name:'Wall sit',sets:3,reps:90,type:'timed'}]),
      4: mk('Explosive Push (W5-8)','upper',[{name:'Clap push-ups',sets:4,reps:8,type:'reps'},{name:'Decline push-ups',sets:4,reps:15,type:'reps'},{name:'Diamond push-ups',sets:4,reps:12,type:'reps'}]),
      5: mk('Explosive Pull (W5-8)','upper',[{name:'Chest-to-bar pull-ups',sets:5,reps:'max',type:'reps'},{name:'Negative pull-ups',sets:4,reps:5,type:'reps'},{name:'Hanging leg raises',sets:4,reps:15,type:'reps'}]),
      6: mk('HIIT Full Body (W5-8)','full',[{name:'Burpees',sets:5,reps:12,type:'reps'},{name:'Pull-ups',sets:5,reps:'max',type:'reps'},{name:'Push-ups',sets:5,reps:20,type:'reps'},{name:'Mountain climbers',sets:5,reps:40,type:'timed'}]),
    };
    return w[dow] ?? rest;
  }
  if (dow===0) return rest;
  const w: Record<number, Plan> = {
    1: mk('Advanced Push (W9-12)','upper',[{name:'Pseudo planche push-ups',sets:4,reps:8,type:'reps'},{name:'Dips',sets:4,reps:15,type:'reps'},{name:'Pike push-ups',sets:4,reps:15,type:'reps'}]),
    2: mk('Advanced Pull (W9-12)','upper',[{name:'Typewriter pull-ups',sets:4,reps:'max',type:'reps'},{name:'Explosive pull-ups',sets:4,reps:'max',type:'reps'},{name:'Hanging leg raises',sets:4,reps:20,type:'reps'}]),
    3: mk('Legs + Core (W9-12)','lower',[{name:'Pistol squat progression',sets:4,reps:5,type:'reps'},{name:'Hanging leg raises',sets:4,reps:20,type:'reps'},{name:'Hollow hold',sets:4,reps:60,type:'timed'}]),
    4: mk('Skill Work (W9-12)','upper',[{name:'L-sit progression',sets:5,reps:10,type:'timed'},{name:'Handstand wall holds',sets:4,reps:20,type:'timed'}]),
    5: mk('Power + Conditioning (W9-12)','full',[{name:'Burpees',sets:5,reps:15,type:'reps'},{name:'Jump squats',sets:5,reps:15,type:'reps'},{name:'Pull-ups',sets:5,reps:'max',type:'reps'}]),
    6: mk('Athletic Circuit (W9-12)','full',[{name:'Chest-to-bar pull-ups',sets:5,reps:'max',type:'reps'},{name:'Clap push-ups',sets:5,reps:10,type:'reps'},{name:'Pistol squat progression',sets:5,reps:5,type:'reps'},{name:'Burpees',sets:5,reps:15,type:'reps'}]),
  };
  return w[dow] ?? rest;
}

// ─── UTILS ────────────────────────────────────────────────────────────────────
const fmt = (s: number): string => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
const getDayNum = (startDate?: string): number => {
  const start = startDate ? new Date(startDate) : new Date();
  start.setHours(0,0,0,0);
  const now = new Date(); now.setHours(0,0,0,0);
  return Math.max(1, Math.min(Math.floor((now.getTime()-start.getTime())/86400000)+1, 90));
};
const estDur = (exs: Exercise[]): number => {
  if (!exs?.length) return 0;
  const w = exs.reduce((a,e) => a+e.sets*(e.type==='timed'?(e.reps as number):30),0);
  const r = exs.reduce((a,e) => a+e.sets*60,0);
  return Math.round((w+r+360)/60);
};
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS_S  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MILESTONES: Record<number,string> = {
  1:'Day 1. Every legend starts here.',
  7:'One week in. You showed up 7 times.',
  14:'Two weeks. The habit is forming.',
  21:'21 days. This is where habits lock in.',
  30:'30 days. One third done. Your body is already different.',
  45:'Halfway. 45 days of showing up for yourself.',
  60:'60 days. Two thirds through. Elite territory now.',
  75:'75 days. The final push. Don\'t stop.',
  90:'90 DAYS. PROGRAM COMPLETE. You became Mike 2.0.',
};

// ─── AUDIO ────────────────────────────────────────────────────────────────────
function useAudio() {
  const ctx = useRef<AudioContext|null>(null);
  const getCtx = () => { if(!ctx.current) ctx.current=new(window.AudioContext||(window as any).webkitAudioContext)(); return ctx.current; };
  const beep = (freq=880,dur=0.1,vol=0.3) => { try { const ac=getCtx(),o=ac.createOscillator(),g=ac.createGain(); o.connect(g);g.connect(ac.destination); o.frequency.value=freq; g.gain.setValueAtTime(vol,ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+dur); o.start();o.stop(ac.currentTime+dur); } catch{} };
  return {
    countdown: ()=>beep(660,0.07,0.2),
    done:      ()=>{beep(880,0.1,0.3);setTimeout(()=>beep(1100,0.15,0.3),160);},
    restOver:  ()=>{beep(1100,0.1,0.3);setTimeout(()=>beep(1100,0.1,0.3),180);setTimeout(()=>beep(1320,0.2,0.4),360);},
    pr:        ()=>{[880,1100,1320,1540].forEach((f,i)=>setTimeout(()=>beep(f,0.12,0.4),i*100));},
    milestone: ()=>{[660,880,1100,880,1100,1320].forEach((f,i)=>setTimeout(()=>beep(f,0.15,0.4),i*120));},
  };
}
const haptic = (p=[50]) => { try { (navigator as any).vibrate?.(p); } catch{} };

function useWakeLock() {
  const lock = useRef<any>(null);
  const acquire = async () => { try { if('wakeLock' in navigator) lock.current=await (navigator as any).wakeLock.request('screen'); } catch{} };
  const release = () => { try { lock.current?.release(); lock.current=null; } catch{} };
  return {acquire,release};
}

// ─── SHARED UI ────────────────────────────────────────────────────────────────
const Logo: React.FC<{t:Theme;size?:number}> = ({t,size=40}) => {
  const g = `linear-gradient(135deg,${t.blueLt},${t.blueDk})`;
  return (
    <div style={{lineHeight:1}}>
      <span style={{fontSize:size,fontWeight:900,letterSpacing:-1,background:g,WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>MIKE</span>
      <span style={{fontSize:size*0.44,fontWeight:700,letterSpacing:1,background:`linear-gradient(135deg,${t.blue}99,${t.blueDk}99)`,WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text',marginLeft:5}}>2.0</span>
    </div>
  );
};
const PBar: React.FC<{t:Theme;pct:number;h?:number;color?:string}> = ({t,pct,h=4,color}) => (
  <div style={{height:h,background:t.border,borderRadius:h/2,overflow:'hidden'}}>
    <div style={{height:'100%',width:`${pct}%`,background:color||`linear-gradient(90deg,${t.blue},${t.blueLt})`,borderRadius:h/2,transition:'width 0.6s'}}/>
  </div>
);
const Card: React.FC<{t:Theme;children:React.ReactNode;style?:React.CSSProperties;glow?:boolean}> = ({t,children,style={},glow=false}) => (
  <div style={{background:t.surface,borderRadius:14,padding:16,border:`1px solid ${glow?t.blue+'66':t.border}`,boxShadow:glow?`0 0 20px ${t.blueGlow}`:t.isDark?'none':'0 2px 8px #0001',marginBottom:12,...style}}>{children}</div>
);
const Btn: React.FC<{t:Theme;children:React.ReactNode;variant?:string;style?:React.CSSProperties;onClick?:()=>void;disabled?:boolean}> = ({t,children,variant='primary',style={},onClick,disabled=false}) => {
  const base: React.CSSProperties = {width:'100%',padding:'13px',borderRadius:10,fontSize:12,fontWeight:900,letterSpacing:2,cursor:disabled?'not-allowed':'pointer',border:'none',fontFamily:'inherit',marginTop:8,opacity:disabled?0.4:1};
  const v: Record<string,React.CSSProperties> = {
    primary:{background:t.blue,color:'#fff'},
    secondary:{background:t.surface2,color:t.txt,border:`1px solid ${t.borderHi}`},
    ghost:{background:'transparent',color:t.txt2,width:'auto',padding:'3px 0',marginTop:0},
    danger:{background:t.isDark?'#FF222220':'#FFEEEE',color:t.red,border:`1px solid ${t.red}44`},
  };
  return <button style={{...base,...(v[variant]||v.primary),...style}} onClick={disabled?undefined:onClick}>{children}</button>;
};
const Lbl: React.FC<{t:Theme;children:React.ReactNode;color?:string;style?:React.CSSProperties}> = ({t,children,color,style={}}) => (
  <div style={{fontSize:9,color:color||t.txt2,letterSpacing:2,marginBottom:6,fontWeight:700,...style}}>{children}</div>
);
const StatBox: React.FC<{t:Theme;label:string;value:number|string;color?:string}> = ({t,label,value,color}) => (
  <div style={{background:t.surface2,border:`1px solid ${t.border}`,borderRadius:10,padding:'10px 6px',textAlign:'center'}}>
    <div style={{fontSize:20,fontWeight:900,color:color||t.blue}}>{value}</div>
    <div style={{fontSize:8,color:t.txt2,letterSpacing:1,marginTop:2}}>{label}</div>
  </div>
);
const ExRow: React.FC<{t:Theme;name:string;sets:number;reps:number|string;type:string}> = ({t,name,sets,reps,type}) => (
  <div style={{display:'flex',alignItems:'center',padding:'6px 0',borderBottom:`1px solid ${t.border}`}}>
    <div style={{width:5,height:5,borderRadius:3,background:t.blue,marginRight:8,flexShrink:0}}/>
    <span style={{flex:1,fontSize:12,color:t.txt}}>{name}</span>
    <span style={{fontSize:11,color:t.txt2,letterSpacing:1}}>{sets}×{type==='timed'?`${reps}s`:reps}</span>
  </div>
);
const Scr: React.FC<{t:Theme;children:React.ReactNode;style?:React.CSSProperties}> = ({t,children,style={}}) => (
  <div style={{background:t.bg,color:t.txt,fontFamily:"'DM Mono','Courier New',monospace",padding:'20px 16px 36px',display:'flex',flexDirection:'column',minHeight:'100vh',...style}}>{children}</div>
);
const Toggle: React.FC<{t:Theme;label:string;value:boolean;onChange:(v:boolean)=>void}> = ({t,label,value,onChange}) => (
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:`1px solid ${t.border}`}}>
    <span style={{fontSize:12,color:t.txt}}>{label}</span>
    <div onClick={()=>onChange(!value)} style={{width:38,height:22,background:value?t.blue:t.border,borderRadius:11,position:'relative',cursor:'pointer',transition:'background 0.2s'}}>
      <div style={{position:'absolute',top:3,left:value?18:3,width:16,height:16,background:'#fff',borderRadius:8,transition:'left 0.2s'}}/>
    </div>
  </div>
);

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const isDark = useSystemTheme();
  const t = isDark ? DARK : LIGHT;
  const [data, setData] = useState<AppData>(loadData);
  const [view, setView] = useState<string>(!loadData().onboarded ? 'onboarding' : 'home');
  const [toast, setToast] = useState<{msg:string;clr:string}|null>(null);
  const [checkin, setCheckin] = useState<Checkin|null>(null);
  const [milestoneDay, setMilestoneDay] = useState<number|null>(null);
  const [pendingLog, setPendingLog] = useState<Record<string,number>>({});
  const [pendingPRs, setPendingPRs] = useState<Record<string,number>>({});

  const logs    = data.logs    || {};
  const prs     = data.prs     || {};
  const settings: Settings = data.settings || {restTime:60,haptics:true,audio:true,notifTime:'07:00',fontSize:'normal',streakAlert:true};
  const curDay  = getDayNum(data.startDate);
  const plan    = getPlan(curDay);
  const totalDone = Object.keys(logs).length;
  const pct     = Math.round((totalDone/90)*100);
  let streak = 0; for(let d=curDay;d>=1;d--){if(logs[d])streak++;else break;}

  const persist = (d: Partial<AppData>) => { const nd={...data,...d}; setData(nd); saveData(nd); };
  const notify  = (msg: string, clr=t.green) => { setToast({msg,clr}); setTimeout(()=>setToast(null),3200); };

  const missedDays = data.startDate
    ? Array.from({length:curDay-1},(_,i)=>i+1).filter(d=>!logs[d]&&!getPlan(d).isRest)
    : [];

  function finishWorkout(repsLog: Record<string,number>, newPRs: Record<string,number>, note: string) {
    const newLogs = {...logs,[curDay]:{date:new Date().toISOString(),repsLog,note}};
    persist({logs:newLogs, prs:{...prs,...newPRs}});
    setCheckin(null);
    if (MILESTONES[curDay]) { setMilestoneDay(curDay); setView('milestone'); }
    else { setView('home'); notify(`Day ${curDay} complete!${Object.keys(newPRs).length?` ${Object.keys(newPRs).length} new PR!`:''}`); }
    if (settings.haptics) haptic([100,50,100]);
  }

  const scale = settings.fontSize==='large' ? 1.15 : 1;

  return (
    <div style={{fontSize:`${scale}em`,minHeight:'100vh',background:t.bg}}>
      {toast && (
        <div style={{position:'fixed',top:16,left:'50%',transform:'translateX(-50%)',background:t.surface,border:`1px solid ${toast.clr}`,borderRadius:8,padding:'10px 18px',fontSize:12,fontWeight:700,zIndex:9999,whiteSpace:'nowrap',letterSpacing:1,color:toast.clr,boxShadow:`0 4px 20px ${toast.clr}22`}}>
          {toast.msg}
        </div>
      )}
      {view==='onboarding' && <Onboarding t={t} onDone={sd=>{persist({onboarded:true,startDate:sd});setView('home');}}/>}
      {view==='home'       && <Home t={t} data={data} curDay={curDay} plan={plan} streak={streak} totalDone={totalDone} pct={pct} missedDays={missedDays} settings={settings} onStart={()=>plan.isRest?setView('restday'):setView('checkin')} onNav={setView} onLogRetro={d=>{persist({logs:{...logs,[d]:{date:new Date().toISOString(),repsLog:{},note:'Retroactive log'}}});notify(`Day ${d} logged`);}}/>}
      {view==='checkin'    && <CheckinView t={t} onDone={r=>{setCheckin(r);setView('warmup');}} onBack={()=>setView('home')}/>}
      {view==='warmup'     && <TimedSeq t={t} title='WARM-UP' items={plan.warmupType==='upper'?WARMUP_UPPER:plan.warmupType==='lower'?WARMUP_LOWER:WARMUP_FULL} color={t.gold} onDone={()=>setView('workout')} onSkip={()=>setView('workout')} skipLabel='Skip'/>}
      {view==='workout'    && <WorkoutView t={t} plan={plan} dayNum={curDay} checkin={checkin} prs={prs} logs={logs} settings={settings} onDone={(r,p)=>{setPendingLog(r);setPendingPRs(p);setView('cooldown');}} onExit={()=>{setCheckin(null);setView('home');}}/>}
      {view==='cooldown'   && <TimedSeq t={t} title='COOL-DOWN' items={COOLDOWN} color={t.blueLt} onDone={()=>setView('summary')} onSkip={()=>setView('summary')} skipLabel='Skip to summary'/>}
      {view==='summary'    && <SummaryView t={t} plan={plan} dayNum={curDay} repsLog={pendingLog} newPRs={pendingPRs} onSave={note=>finishWorkout(pendingLog,pendingPRs,note)} onBack={()=>setView('home')}/>}
      {view==='restday'    && <TimedSeq t={t} title='RECOVERY' items={REST_DAY} color={t.green} onDone={()=>{persist({logs:{...logs,[curDay]:{date:new Date().toISOString(),repsLog:{},note:'Recovery day'}}});setView('home');notify('Recovery logged');}} onSkip={()=>setView('home')} skipLabel='Skip & log'/>}
      {view==='milestone'  && <MilestoneView t={t} day={milestoneDay||1} onContinue={()=>setView('home')}/>}
      {view==='progress'   && <ProgressView t={t} logs={logs} prs={prs} dayNum={curDay} onBack={()=>setView('home')}/>}
      {view==='calendar'   && <CalendarView t={t} logs={logs} dayNum={curDay} onBack={()=>setView('home')}/>}
      {view==='library'    && <LibraryView t={t} onBack={()=>setView('home')}/>}
      {view==='settings'   && <SettingsView t={t} data={data} settings={settings} onSave={s=>{persist({settings:s});notify('Settings saved');}} onReset={()=>{if(window.confirm('Reset all data?')){localStorage.removeItem('mike2v1');window.location.reload();}}} onBack={()=>setView('home')}/>}
    </div>
  );
}

// ─── ONBOARDING ───────────────────────────────────────────────────────────────
const Onboarding: React.FC<{t:Theme;onDone:(sd:string)=>void}> = ({t,onDone}) => {
  const [slide,setSlide] = useState(0);
  const [sd,setSd] = useState(new Date().toISOString().split('T')[0]);
  const [level,setLevel] = useState(1);
  const LEVELS=[['🌱','Beginner','Never trained'],['🔥','Intermediate','Some experience'],['⚡','Advanced','Regular trainer']];
  const slides=[
    {body:'90 days.\nOne pull-up bar.\nYour body as the weight.',sub:'A structured calisthenics program to build a slim athletic physique with visible abs and elite strength.'},
    {icon:'🏋️',title:'WHAT YOU NEED',body:'Just a pull-up bar.',sub:'Everything runs on bodyweight. No gym. No equipment. Train anywhere.'},
    {icon:'💪',title:'FITNESS LEVEL',body:'How are you starting?',sub:'This helps us suggest the right modifications from day one.',hasLevel:true},
    {icon:'📅',title:'START DATE',body:'When do you begin?',sub:'The app calculates your day number automatically.',hasDate:true},
  ];
  const s = slides[slide];
  return (
    <Scr t={t} style={{justifyContent:'space-between'}}>
      <div style={{flex:1,display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center',textAlign:'center',padding:'16px 0'}}>
        {slide===0?(<div style={{marginBottom:28}}><Logo t={t} size={52}/><div style={{fontSize:10,letterSpacing:3,color:t.txt2,marginTop:6}}>BUILD THE BODY. BECOME THE VERSION.</div></div>):(<div style={{fontSize:52,marginBottom:20}}>{s.icon}</div>)}
        {s.title && <Lbl t={t} color={t.blue}>{s.title}</Lbl>}
        <div style={{fontSize:20,fontWeight:900,letterSpacing:-0.5,marginBottom:12,lineHeight:1.3,whiteSpace:'pre-line'}}>{s.body}</div>
        <div style={{fontSize:12,color:t.txt2,lineHeight:1.6,maxWidth:280,marginBottom:20}}>{s.sub}</div>
        {s.hasLevel && (<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,width:'100%'}}>{LEVELS.map(([ic,lb,sub],i)=>(<button key={i} onClick={()=>setLevel(i)} style={{background:level===i?t.blueGlow:t.surface,border:`1px solid ${level===i?t.blue:t.border}`,borderRadius:12,padding:'14px 6px',cursor:'pointer',fontFamily:'inherit',textAlign:'center'}}><div style={{fontSize:24}}>{ic}</div><div style={{fontSize:10,fontWeight:700,color:level===i?t.blue:t.txt,marginTop:4}}>{lb}</div><div style={{fontSize:9,color:t.txt2,marginTop:2}}>{sub}</div></button>))}</div>)}
        {s.hasDate && (<input type='date' value={sd} onChange={e=>setSd(e.target.value)} style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:10,color:t.txt,fontSize:16,padding:'12px 14px',width:'100%',fontFamily:'inherit',textAlign:'center'}}/>)}
      </div>
      <div>
        <div style={{display:'flex',justifyContent:'center',gap:8,marginBottom:16}}>{slides.map((_,i)=><div key={i} style={{width:i===slide?18:7,height:7,borderRadius:4,background:i===slide?t.blue:t.border,transition:'width 0.3s'}}/>)}</div>
        <Btn t={t} onClick={()=>slide<slides.length-1?setSlide(s=>s+1):onDone(sd)}>{slide===slides.length-1?'START MIKE 2.0 →':'NEXT →'}</Btn>
      </div>
    </Scr>
  );
};

// ─── HOME ─────────────────────────────────────────────────────────────────────
const Home: React.FC<{t:Theme;data:AppData;curDay:number;plan:Plan;streak:number;totalDone:number;pct:number;missedDays:number[];settings:Settings;onStart:()=>void;onNav:(v:string)=>void;onLogRetro:(d:number)=>void}> = ({t,data,curDay,plan,streak,totalDone,pct,missedDays,onStart,onNav,onLogRetro}) => {
  const now=new Date();
  const nextPlan=getPlan(Math.min(curDay+1,90));
  const doneToday=!!(data.logs||{})[curDay];
  const dur=estDur(plan.exercises);
  return (
    <Scr t={t}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
        <div><div style={{fontSize:9,color:t.txt3,letterSpacing:2,marginBottom:3}}>{DAYS_S[now.getDay()]}, {MONTHS[now.getMonth()]} {now.getDate()}</div><Logo t={t} size={40}/></div>
        <div style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:10,padding:'8px 12px',textAlign:'center'}}><div style={{fontSize:18}}>🔥</div><div style={{fontSize:22,fontWeight:900,color:t.gold,lineHeight:1}}>{streak}</div><div style={{fontSize:8,color:t.txt2,letterSpacing:1}}>STREAK</div></div>
      </div>
      {plan.isDeload && <div style={{background:t.isDark?'#0A1A0A':'#E8F8E8',border:`1px solid ${t.green}33`,borderRadius:10,padding:'8px 12px',marginBottom:12,fontSize:11,color:t.green,textAlign:'center'}}>📉 DELOAD WEEK — Reduced intensity for recovery</div>}
      {missedDays.length>0 && (<div style={{background:t.isDark?'#1A0A00':'#FFF4E6',border:`1px solid ${t.gold}44`,borderRadius:10,padding:'10px 12px',marginBottom:12}}><div style={{fontSize:11,color:t.gold,marginBottom:6}}>⚠️ Missed {missedDays.length} day{missedDays.length>1?'s':''}</div><div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{missedDays.slice(-5).map(d=><button key={d} onClick={()=>onLogRetro(d)} style={{background:'transparent',border:`1px solid ${t.gold}44`,borderRadius:6,color:t.gold,fontSize:10,padding:'3px 8px',cursor:'pointer',fontFamily:'inherit'}}>Log Day {d}</button>)}</div></div>)}
      <div style={{marginBottom:16}}><div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:t.txt2,marginBottom:5,letterSpacing:1}}><span>Day {curDay} / 90</span><span style={{color:t.blue,fontWeight:700}}>{pct}%</span></div><PBar t={t} pct={pct}/></div>
      <Card t={t} glow>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
          <div><Lbl t={t} color={t.blue}>TODAY</Lbl><div style={{fontSize:18,fontWeight:700}}>{plan.focus}</div></div>
          <div style={{textAlign:'right'}}>{doneToday&&<div style={{background:`${t.green}20`,color:t.green,border:`1px solid ${t.green}44`,borderRadius:6,padding:'3px 8px',fontSize:10,fontWeight:700,marginBottom:4}}>✓ DONE</div>}<div style={{fontSize:10,color:t.txt2,letterSpacing:1}}>{plan.isRest?'REST DAY':`~${dur} MIN`}</div></div>
        </div>
        {plan.isRest?(<div style={{textAlign:'center',padding:'16px 0'}}><div style={{fontSize:36}}>🧘</div><div style={{color:t.txt2,marginTop:8,fontSize:12}}>Stretch · Walk · Breathe · Recover</div></div>):(<div style={{marginBottom:10}}>{plan.exercises.map((ex,i)=><ExRow key={i} t={t} name={ex.name} sets={ex.sets} reps={ex.reps} type={ex.type}/>)}</div>)}
        <Btn t={t} onClick={onStart}>{plan.isRest?'START RECOVERY →':doneToday?'REDO WORKOUT →':'START WORKOUT →'}</Btn>
      </Card>
      {curDay<90 && (<Card t={t} style={{padding:'12px 14px'}}><Lbl t={t}>TOMORROW</Lbl><div style={{display:'flex',justifyContent:'space-between'}}><div style={{fontSize:13,fontWeight:700}}>{nextPlan.focus}</div><div style={{fontSize:10,color:t.txt2}}>~{estDur(nextPlan.exercises)} min</div></div>{!nextPlan.isRest&&<div style={{fontSize:11,color:t.txt2,marginTop:3}}>{nextPlan.exercises.slice(0,3).map(e=>e.name).join(' · ')}</div>}</Card>)}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:12}}><StatBox t={t} label='DONE' value={totalDone}/><StatBox t={t} label='LEFT' value={90-totalDone}/><StatBox t={t} label='STREAK' value={streak} color={t.gold}/></div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:8}}>{[['📅','CAL','calendar'],['📊','PROG','progress'],['📖','EX','library'],['⚙️','SET','settings']].map(([ic,lb,v])=>(<button key={v} onClick={()=>onNav(v)} style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:10,padding:'10px 4px',textAlign:'center',cursor:'pointer',fontFamily:'inherit'}}><div style={{fontSize:16}}>{ic}</div><div style={{fontSize:8,color:t.txt2,letterSpacing:1,marginTop:3,fontWeight:700}}>{lb}</div></button>))}</div>
    </Scr>
  );
};

// ─── CHECKIN ──────────────────────────────────────────────────────────────────
const CheckinView: React.FC<{t:Theme;onDone:(c:Checkin)=>void;onBack:()=>void}> = ({t,onDone,onBack}) => {
  const [energy,setEnergy]=useState<number|null>(null);
  const [soreness,setSoreness]=useState<number|null>(null);
  const EN=[['😴','LOW'],['😐','OKAY'],['💪','GOOD'],['⚡','GREAT']];
  const SO=[['🟢','FRESH'],['🟡','MILD'],['🟠','SORE'],['🔴','WRECKED']];
  const ready=energy!==null&&soreness!==null;
  return (
    <Scr t={t}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20}}><Btn t={t} variant='ghost' onClick={onBack}>← Back</Btn><div style={{fontSize:14,fontWeight:900,letterSpacing:2}}>PRE-WORKOUT</div></div>
      <div style={{fontSize:12,color:t.txt2,marginBottom:20}}>Quick check-in before we start, Mike.</div>
      <Lbl t={t} color={t.blue}>ENERGY LEVEL</Lbl>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:6,marginBottom:20}}>{EN.map(([ic,lb],i)=>(<button key={i} onClick={()=>{setEnergy(i);haptic([30]);}} style={{background:energy===i?t.blueGlow:t.surface,border:`1px solid ${energy===i?t.blue:t.border}`,borderRadius:10,padding:'12px 4px',cursor:'pointer',fontFamily:'inherit',textAlign:'center'}}><div style={{fontSize:22}}>{ic}</div><div style={{fontSize:8,marginTop:4,color:energy===i?t.blue:t.txt2,letterSpacing:1,fontWeight:700}}>{lb}</div></button>))}</div>
      <Lbl t={t} color={t.blue}>SORENESS</Lbl>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:6,marginBottom:20}}>{SO.map(([ic,lb],i)=>(<button key={i} onClick={()=>{setSoreness(i);haptic([30]);}} style={{background:soreness===i?t.blueGlow:t.surface,border:`1px solid ${soreness===i?t.blue:t.border}`,borderRadius:10,padding:'12px 4px',cursor:'pointer',fontFamily:'inherit',textAlign:'center'}}><div style={{fontSize:22}}>{ic}</div><div style={{fontSize:8,marginTop:4,color:soreness===i?t.blue:t.txt2,letterSpacing:1,fontWeight:700}}>{lb}</div></button>))}</div>
      {ready&&(<div style={{background:t.isDark?'#0A1628':'#EBF4FF',border:`1px solid ${t.blue}22`,borderRadius:10,padding:'12px 14px',marginBottom:16,textAlign:'center'}}><div style={{fontSize:12,color:(soreness??0)>=3?t.gold:(energy??0)>=2?t.green:t.txt2}}>{(soreness??0)>=3?'⚠️ Very sore — rest extended to 90s':(energy??0)>=2?'✓ Ready. Let\'s get to work.':'Take it steady — form over reps.'}</div></div>)}
      <Btn t={t} disabled={!ready} onClick={()=>onDone({energy:energy!,soreness:soreness!})}>LET'S GO →</Btn>
    </Scr>
  );
};

// ─── TIMED SEQUENCE ───────────────────────────────────────────────────────────
const TimedSeq: React.FC<{t:Theme;title:string;items:TimedItem[];color:string;onDone:()=>void;onSkip:()=>void;skipLabel?:string}> = ({t,title,items,color,onDone,onSkip,skipLabel='Skip'}) => {
  const [idx,setIdx]=useState(0);
  const [timer,setTimer]=useState(items[0].duration);
  const [running,setRunning]=useState(false);
  const audio=useAudio();
  const ref=useRef<ReturnType<typeof setInterval>|null>(null);
  useEffect(()=>{
    if(!running)return;
    ref.current=setInterval(()=>{
      setTimer(tm=>{
        if(tm<=3&&tm>1)audio.countdown();
        if(tm<=1){if(ref.current)clearInterval(ref.current);setRunning(false);audio.done();haptic([50,30,50]);
          if(idx+1<items.length){setIdx(i=>i+1);setTimer(items[idx+1].duration);}else onDone();
          return 0;}
        return tm-1;
      });
    },1000);
    return()=>{if(ref.current)clearInterval(ref.current);};
  },[running,idx]);
  const item=items[idx];
  return (
    <Scr t={t}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}><Btn t={t} variant='ghost' onClick={onSkip}>{skipLabel}</Btn><div style={{fontSize:10,color,letterSpacing:2,fontWeight:700}}>{title}</div><div style={{fontSize:10,color:t.txt2}}>{idx+1}/{items.length}</div></div>
      <PBar t={t} pct={(idx/items.length)*100} color={`linear-gradient(90deg,${color},${color}88)`}/>
      <Card t={t} style={{marginTop:16,textAlign:'center'}}>
        <Lbl t={t} color={color}>EXERCISE {idx+1} OF {items.length}</Lbl>
        <div style={{fontSize:22,fontWeight:900,marginBottom:8}}>{item.name}</div>
        <div style={{fontSize:12,color:t.txt2,marginBottom:22,lineHeight:1.5}}>{item.desc}</div>
        <div style={{fontSize:56,fontWeight:900,letterSpacing:-3,color:timer<=5?t.red:t.txt,marginBottom:16}}>{fmt(timer)}</div>
        {!running?<Btn t={t} style={{background:color,color:'#000'}} onClick={()=>setRunning(true)}>▶ START</Btn>:<Btn t={t} variant='secondary' onClick={()=>{if(ref.current)clearInterval(ref.current);setRunning(false);if(idx+1<items.length){setIdx(i=>i+1);setTimer(items[idx+1].duration);}else onDone();}}>Next →</Btn>}
      </Card>
      <div style={{display:'flex',gap:6,marginTop:14,justifyContent:'center'}}>{items.map((_,i)=><div key={i} style={{width:7,height:7,borderRadius:4,background:i<idx?color:i===idx?t.txt:t.border}}/>)}</div>
    </Scr>
  );
};

// ─── WORKOUT ──────────────────────────────────────────────────────────────────
const WorkoutView: React.FC<{t:Theme;plan:Plan;dayNum:number;checkin:Checkin|null;prs:Record<string,number>;logs:Record<number,LogEntry>;settings:Settings;onDone:(r:Record<string,number>,p:Record<string,number>,n:string)=>void;onExit:()=>void}> = ({t,plan,checkin,prs,logs,settings,onDone,onExit}) => {
  const exs=plan.exercises;
  const [ei,setEi]=useState(0);
  const [si,setSi]=useState(0);
  const [phase,setPhase]=useState('intro');
  const [timer,setTimer]=useState(0);
  const [running,setRunning]=useState(false);
  const [tapCount,setTapCount]=useState(0);
  const [repInput,setRepInput]=useState('');
  const [repsLog,setRepsLog]=useState<Record<string,number>>({});
  const [newPRs,setNewPRs]=useState<Record<string,number>>({});
  const [tipIdx,setTipIdx]=useState(0);
  const [useMod,setUseMod]=useState<Record<number,boolean>>({});
  const [paused,setPaused]=useState(false);
  const [setTags,setSetTags]=useState<Record<string,string>>({});
  const ref=useRef<ReturnType<typeof setInterval>|null>(null);
  const audio=useAudio();
  const wake=useWakeLock();
  useEffect(()=>{wake.acquire();return()=>wake.release();},[]);

  const ex=exs[ei];
  const db=ex?(DB[ex.name]||{} as ExerciseInfo):{} as ExerciseInfo;
  const isTimed=ex?.type==='timed';
  const REST = (checkin && checkin.soreness>=3) ? 90 : (checkin && checkin.energy<=1) ? 75 : (settings.restTime||60);
  const lastLog=Object.values(logs).slice(-3).reverse().find(l=>l.repsLog&&l.repsLog[`${ei}-${si}`]!==undefined);
  const lastReps=lastLog?lastLog.repsLog[`${ei}-${si}`]:null;

  useEffect(()=>{
    if(!running||paused)return;
    ref.current=setInterval(()=>{
      setTimer(tm=>{
        if(tm<=3&&tm>1&&settings.audio!==false)audio.countdown();
        if(tm<=1){if(ref.current)clearInterval(ref.current);setRunning(false);
          if(phase==='work'){if(settings.audio!==false)audio.done();if(settings.haptics!==false)haptic([80,30,80]);startRest();}
          else if(phase==='rest'){if(settings.audio!==false)audio.restOver();if(settings.haptics!==false)haptic([50,30,50,30,100]);advance();}
          return 0;}
        return tm-1;
      });
    },1000);
    return()=>{if(ref.current)clearInterval(ref.current);};
  },[running,phase,paused]);

  const startWork=()=>{setPhase('work');setTapCount(0);if(isTimed){setTimer(ex.reps as number);setRunning(true);}};
  const startRest=()=>{setPhase('rest');setTimer(REST);setRunning(true);};
  const advance=()=>{
    if(si+1<ex.sets){setSi(s=>s+1);setPhase('intro');}
    else if(ei+1<exs.length){setEi(e=>e+1);setSi(0);setPhase('intro');setTipIdx(0);}
    else{onDone(repsLog,newPRs,'');}
  };
  const logReps=()=>{
    const r=tapCount>0?tapCount:Number(repInput)||0;
    const k=`${ei}-${si}`;
    setRepsLog(p=>({...p,[k]:r}));
    if(ex.reps==='max'&&r>0){const old=prs[ex.name]||0;if(r>old){setNewPRs(p=>({...p,[ex.name]:r}));if(settings.audio!==false)audio.pr();if(settings.haptics!==false)haptic([50,30,50,30,50,30,200]);}}
    setRepInput('');setTapCount(0);startRest();
  };

  const totalSets=exs.reduce((a,e)=>a+e.sets,0);
  const doneSets=exs.slice(0,ei).reduce((a,e)=>a+e.sets,0)+si;
  const prog=totalSets?(doneSets/totalSets)*100:0;
  const tips=db.tips||[];
  const TAG_COLORS: Record<string,string>={easy:t.green,good:t.blue,hard:t.gold,failed:t.red};

  return (
    <Scr t={t}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
        <Btn t={t} variant='ghost' onClick={onExit}>✕</Btn>
        <div style={{fontSize:10,color:t.txt2,letterSpacing:2}}>{plan.focus.replace(/\s*\(.*\)/,'').toUpperCase()}</div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <button onClick={()=>{setPaused(p=>!p);if(ref.current)clearInterval(ref.current);setRunning(r=>!r);}} style={{background:'transparent',border:'none',color:t.txt2,fontSize:16,cursor:'pointer'}}>{paused?'▶':'⏸'}</button>
          <div style={{fontSize:10,color:t.txt2}}>{ei+1}/{exs.length}</div>
        </div>
      </div>
      <PBar t={t} pct={prog}/>
      {paused&&<div style={{textAlign:'center',padding:'8px',background:`${t.gold}15`,borderRadius:8,margin:'8px 0',fontSize:11,color:t.gold}}>⏸ PAUSED — tap ▶ to resume</div>}
      <Card t={t} style={{marginTop:12}}>
        <Lbl t={t}>EXERCISE {ei+1} OF {exs.length}</Lbl>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
          <div><div style={{fontSize:24,fontWeight:900,marginBottom:2}}>{ex?.name}</div><div style={{fontSize:11,color:t.txt2,marginBottom:2}}>{db.muscle||''}</div></div>
          {prs[ex?.name]&&<div style={{fontSize:10,color:t.gold,textAlign:'right'}}>🏆 PR<br/>{prs[ex.name]}</div>}
        </div>
        {ex?.reps==='max'&&lastReps!=null&&<div style={{fontSize:10,color:t.blue,marginBottom:8}}>🎯 Target: {lastReps+1} reps (last: {lastReps})</div>}
        <div style={{display:'flex',gap:5,marginBottom:3}}>{Array.from({length:ex?.sets||1},(_,i)=><div key={i} style={{width:9,height:9,borderRadius:5,background:i<si?t.blue:i===si?t.txt:t.border}}/>)}</div>
        <div style={{fontSize:10,color:t.txt2,letterSpacing:1,marginBottom:16}}>Set {si+1} of {ex?.sets}</div>

        {phase==='intro'&&(<div style={{textAlign:'center'}}>
          <div style={{fontSize:26,fontWeight:900,color:t.blue,marginBottom:8}}>{isTimed?`${ex.reps}s`:ex.reps==='max'?'MAX REPS':`${ex.reps} REPS`}</div>
          {db.breathe&&<div style={{fontSize:11,color:t.txt2,marginBottom:14}}>💨 {db.breathe}</div>}
          {useMod[ei]&&db.mod&&<div style={{fontSize:11,color:t.gold,marginBottom:10}}>🔄 Using: {db.mod}</div>}
          <Btn t={t} onClick={startWork}>{isTimed?'▶ START TIMER':'▶ GO'}</Btn>
          {db.mod&&!useMod[ei]&&<div style={{fontSize:11,color:t.gold,textAlign:'center',marginTop:10,cursor:'pointer'}} onClick={()=>setUseMod(m=>({...m,[ei]:true}))}>Can't do it? Use easier variation →</div>}
        </div>)}

        {phase==='work'&&isTimed&&(<div style={{textAlign:'center'}}>
          <div style={{fontSize:56,fontWeight:900,letterSpacing:-3,color:timer<=10?t.red:t.txt,transition:'color 0.3s'}}>{fmt(timer)}</div>
          <div style={{fontSize:11,color:t.txt2,marginBottom:14}}>Hold strong!</div>
          <Btn t={t} variant='secondary' onClick={()=>{if(ref.current)clearInterval(ref.current);setRunning(false);audio.done();startRest();}}>Done early</Btn>
        </div>)}

        {phase==='work'&&!isTimed&&(<div style={{textAlign:'center'}}>
          <div style={{fontSize:18,fontWeight:700,color:t.blue,marginBottom:14}}>{ex.reps==='max'?'DO YOUR MAX':`DO ${ex.reps} REPS`}</div>
          <Lbl t={t} color={t.txt2}>TAP TO COUNT</Lbl>
          <button onClick={()=>{setTapCount(n=>n+1);haptic([20]);}} style={{width:88,height:88,borderRadius:44,background:`linear-gradient(135deg,${t.blue},${t.blueDk})`,border:'none',cursor:'pointer',fontSize:30,fontWeight:900,color:'#fff',boxShadow:`0 0 24px ${t.blueGlow}`,fontFamily:'inherit',marginBottom:4}}>{tapCount}</button>
          <div style={{fontSize:10,color:t.txt2,marginBottom:10}}>reps — or type below</div>
          <input style={{background:t.surface2,border:`1px solid ${t.border}`,borderRadius:8,color:t.txt,fontSize:22,fontWeight:900,padding:'8px 12px',textAlign:'center',width:'100%',fontFamily:'inherit',boxSizing:'border-box',marginBottom:6}} type='number' placeholder='Type reps...' value={repInput} onChange={e=>setRepInput(e.target.value)}/>
          <Btn t={t} onClick={logReps}>LOG {tapCount>0?tapCount:repInput||'?'} REPS ✓</Btn>
        </div>)}

        {phase==='rest'&&(<div style={{textAlign:'center'}}>
          <div style={{fontSize:10,color:t.gold,letterSpacing:3,marginBottom:4}}>REST</div>
          <div style={{fontSize:56,fontWeight:900,letterSpacing:-3,color:timer<=10?t.green:t.txt,transition:'color 0.3s'}}>{fmt(timer)}</div>
          <div style={{fontSize:10,color:t.txt2,marginBottom:8}}>{REST}s rest</div>
          <div style={{display:'flex',gap:6,justifyContent:'center',marginBottom:14}}>{['easy','good','hard','failed'].map(tag=><button key={tag} onClick={()=>setSetTags(s=>({...s,[`${ei}-${Math.max(0,si-1)}`]:tag}))} style={{background:setTags[`${ei}-${Math.max(0,si-1)}`]===tag?TAG_COLORS[tag]+'33':'transparent',border:`1px solid ${TAG_COLORS[tag]}55`,borderRadius:6,color:TAG_COLORS[tag],fontSize:9,padding:'4px 8px',cursor:'pointer',fontFamily:'inherit',fontWeight:700,letterSpacing:1}}>{tag.toUpperCase()}</button>)}</div>
          <Btn t={t} variant='secondary' onClick={()=>{if(ref.current)clearInterval(ref.current);setRunning(false);advance();}}>Skip →</Btn>
        </div>)}
      </Card>
      {tips.length>0&&(<div style={{background:t.isDark?'#08101E':'#EBF4FF',border:`1px solid ${t.blue}18`,borderRadius:10,padding:12,cursor:'pointer'}} onClick={()=>setTipIdx(i=>i+1)}>
        <div style={{fontSize:9,color:t.blue,letterSpacing:2,marginBottom:5}}>💡 TIP <span style={{color:t.txt3,fontSize:8}}>(tap for next)</span></div>
        <div style={{fontSize:12,color:t.txt2,lineHeight:1.5}}>{tips[tipIdx%tips.length]}</div>
        {db.mod&&<div style={{fontSize:10,color:t.txt3,borderTop:`1px solid ${t.border}`,paddingTop:6,marginTop:6}}>🔄 {db.mod}</div>}
      </div>)}
    </Scr>
  );
};

// ─── SUMMARY ──────────────────────────────────────────────────────────────────
const SummaryView: React.FC<{t:Theme;plan:Plan;dayNum:number;repsLog:Record<string,number>;newPRs:Record<string,number>;onSave:(n:string)=>void;onBack:()=>void}> = ({t,plan,dayNum,repsLog,newPRs,onSave,onBack}) => {
  const [note,setNote]=useState('');
  const total=Object.values(repsLog).reduce((a,b)=>a+Number(b||0),0);
  const prList=Object.entries(newPRs);
  return (
    <Scr t={t}>
      <div style={{textAlign:'center',marginBottom:20}}><div style={{fontSize:56,marginBottom:6}}>🏆</div><div style={{fontSize:28,fontWeight:900,letterSpacing:-1,background:`linear-gradient(135deg,${t.blueLt},${t.blueDk})`,WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>CRUSHED IT</div><div style={{color:t.blue,fontSize:11,letterSpacing:2,marginTop:4}}>DAY {dayNum} COMPLETE</div></div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:14}}><StatBox t={t} label='EXERCISES' value={plan.exercises.length}/><StatBox t={t} label='TOTAL REPS' value={total}/><StatBox t={t} label='NEW PRs' value={prList.length} color={t.gold}/></div>
      {prList.length>0&&(<Card t={t} style={{background:t.isDark?'#0F0E00':'#FFFBE6',borderColor:`${t.gold}44`}}><Lbl t={t} color={t.gold}>🏆 NEW PERSONAL RECORDS</Lbl>{prList.map(([n,v])=>(<div key={n} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:`1px solid ${t.isDark?'#1A1400':'#FFE58F'}`,fontSize:12}}><span style={{color:t.txt2}}>{n}</span><span style={{color:t.gold,fontWeight:700}}>★ {v}</span></div>))}</Card>)}
      <Lbl t={t}>WORKOUT NOTE (optional)</Lbl>
      <textarea style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:10,color:t.txt,fontSize:12,padding:10,width:'100%',boxSizing:'border-box',fontFamily:'inherit',resize:'none',height:72,marginBottom:12}} placeholder='How did it feel? Anything to note...' value={note} onChange={e=>setNote(e.target.value)}/>
      <Btn t={t} onClick={()=>onSave(note)}>SAVE & FINISH</Btn>
      <Btn t={t} variant='ghost' style={{display:'block',margin:'8px auto 0',fontSize:11}} onClick={onBack}>Exit without saving</Btn>
    </Scr>
  );
};

// ─── MILESTONE ────────────────────────────────────────────────────────────────
const MilestoneView: React.FC<{t:Theme;day:number;onContinue:()=>void}> = ({t,day,onContinue}) => {
  const [pulse,setPulse]=useState(false);
  const audio=useAudio();
  useEffect(()=>{audio.milestone();haptic([100,50,100,50,200]);const i=setInterval(()=>setPulse(p=>!p),900);return()=>clearInterval(i);},[]);
  const is90=day===90;
  return (
    <Scr t={t} style={{justifyContent:'center',alignItems:'center',textAlign:'center',position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',inset:0,background:`radial-gradient(circle at 50% 40%, ${t.blue}18 0%, transparent 65%)`,pointerEvents:'none'}}/>
      <div style={{fontSize:is90?80:64,transform:pulse?'scale(1.1)':'scale(1)',transition:'transform 0.5s ease',marginBottom:12}}>{is90?'🏆':'🔥'}</div>
      <div style={{fontSize:11,color:t.blue,letterSpacing:4,marginBottom:6}}>{is90?'PROGRAM COMPLETE':'MILESTONE UNLOCKED'}</div>
      <div style={{fontSize:is90?48:64,fontWeight:900,letterSpacing:-3,background:`linear-gradient(135deg,${t.blueLt},${t.blueDk})`,WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>{is90?'MIKE 2.0':day}</div>
      {!is90&&<div style={{fontSize:11,color:t.txt2,letterSpacing:2,marginBottom:6}}>DAYS DONE</div>}
      <div style={{fontSize:13,color:t.txt,maxWidth:280,lineHeight:1.6,margin:'14px auto 24px'}}>{MILESTONES[day]||`Day ${day} complete.`}</div>
      <Btn t={t} onClick={onContinue}>{is90?'VIEW FINAL STATS →':'KEEP GOING →'}</Btn>
    </Scr>
  );
};

// ─── PROGRESS ─────────────────────────────────────────────────────────────────
const ProgressView: React.FC<{t:Theme;logs:Record<number,LogEntry>;prs:Record<string,number>;dayNum:number;onBack:()=>void}> = ({t,logs,prs,dayNum,onBack}) => {
  const weeks=Array.from({length:13},(_,w)=>{const days=Array.from({length:7},(_,d)=>w*7+d+1).filter(d=>d<=90);return{w:w+1,total:days.length,done:days.filter(d=>logs[d]).length};}).filter(w=>w.total>0);
  const done=Object.keys(logs).length;
  const rate=dayNum>0?Math.round((done/dayNum)*100):0;
  const prList=Object.entries(prs);
  const recentNotes=Object.entries(logs).filter(([,v])=>v.note&&v.note!=='Recovery day'&&v.note!=='Retroactive log').slice(-5).reverse();
  function exportData(){try{const b=new Blob([JSON.stringify({logs,prs,exported:new Date().toISOString()},null,2)],{type:'application/json'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=`mike2-${new Date().toISOString().split('T')[0]}.json`;a.click();URL.revokeObjectURL(u);}catch(e){alert('Export failed');}}
  return (
    <Scr t={t}>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}><Btn t={t} variant='ghost' onClick={onBack}>← Back</Btn><div style={{fontSize:14,fontWeight:900,letterSpacing:2}}>PROGRESS</div></div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:16}}><StatBox t={t} label='WORKOUTS' value={done}/><StatBox t={t} label='CONSIST.' value={`${rate}%`}/><StatBox t={t} label='DAY' value={dayNum}/></div>
      {prList.length>0&&(<><Lbl t={t} color={t.blue}>PERSONAL RECORDS 🏆</Lbl><Card t={t} style={{background:t.isDark?'#0F0E00':'#FFFBE6',borderColor:`${t.gold}33`,padding:'12px 14px'}}>{prList.map(([n,v])=>(<div key={n} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:`1px solid ${t.isDark?'#1A1400':'#FFE58F'}`,fontSize:12}}><span style={{color:t.txt2}}>{n}</span><span style={{color:t.gold,fontWeight:700}}>★ {v} reps</span></div>))}</Card></>)}
      <Lbl t={t} color={t.blue}>WEEKLY BREAKDOWN</Lbl>
      {weeks.map(w=>(<div key={w.w} style={{display:'flex',alignItems:'center',gap:8,marginBottom:7}}><div style={{fontSize:9,color:t.txt2,width:44}}>Week {w.w}</div><div style={{flex:1,height:8,background:t.border,borderRadius:4,overflow:'hidden'}}><div style={{height:'100%',background:`linear-gradient(90deg,${t.blue},${t.blueLt})`,borderRadius:4,width:`${(w.done/w.total)*100}%`}}/></div><div style={{fontSize:9,color:t.txt2,width:24,textAlign:'right'}}>{w.done}/{w.total}</div></div>))}
      <Lbl t={t} color={t.blue} style={{marginTop:14}}>LAST 30 DAYS</Lbl>
      <div style={{display:'grid',gridTemplateColumns:'repeat(10,1fr)',gap:3,marginBottom:14}}>
        {Array.from({length:Math.min(dayNum,30)},(_,i)=>{const d=dayNum-i;const l=logs[d];const rep=l?.repsLog?Object.values(l.repsLog).reduce((a,b)=>a+Number(b||0),0):0;const cols=[`${t.blue}44`,`${t.blue}88`,t.blue];return <div key={d} style={{aspectRatio:'1',borderRadius:3,background:l?cols[Math.min(2,Math.floor(rep/30))]:t.border}}/>;}).reverse()}
      </div>
      {recentNotes.length>0&&(<><Lbl t={t} color={t.blue}>RECENT NOTES</Lbl>{recentNotes.map(([day,entry])=>(<Card key={day} t={t} style={{padding:'10px 14px',marginBottom:8}}><div style={{fontSize:9,color:t.txt2,letterSpacing:1,marginBottom:3}}>Day {day}</div><div style={{fontSize:12,color:t.txt2}}>{entry.note}</div></Card>))}</>)}
      <Btn t={t} variant='secondary' style={{marginTop:12}} onClick={exportData}>⬇ EXPORT DATA</Btn>
    </Scr>
  );
};

// ─── CALENDAR ─────────────────────────────────────────────────────────────────
const CalendarView: React.FC<{t:Theme;logs:Record<number,LogEntry>;dayNum:number;onBack:()=>void}> = ({t,logs,dayNum,onBack}) => {
  const [sel,setSel]=useState<number|null>(null);
  const preview=sel?getPlan(sel):null;
  const selLog=sel?logs[sel]:null;
  return (
    <Scr t={t}>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}><Btn t={t} variant='ghost' onClick={onBack}>← Back</Btn><div style={{fontSize:14,fontWeight:900,letterSpacing:2}}>CALENDAR</div></div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(10,1fr)',gap:3,marginBottom:14}}>
        {Array.from({length:90},(_,i)=>{const d=i+1,done=!!logs[d],today=d===dayNum,future=d>dayNum,p=getPlan(d);return(<div key={d} onClick={()=>setSel(d)} style={{aspectRatio:'1',borderRadius:4,cursor:'pointer',border:today?`1px solid ${t.blue}`:done?`1px solid ${t.blue}33`:`1px solid ${t.border}`,background:today?`${t.blue}22`:done?`${t.blue}15`:'transparent',opacity:future?0.3:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}><div style={{fontSize:8,color:today?t.blue:done?t.blue:t.txt3}}>{d}</div>{done&&<div style={{fontSize:6,color:t.blue}}>✓</div>}{p.isRest&&!done&&<div style={{fontSize:6}}>💤</div>}</div>);})}
      </div>
      {sel&&preview&&(<Card t={t}><div style={{fontWeight:700,marginBottom:10,fontSize:13}}>Day {sel} — {preview.focus}</div>{preview.isRest?<div style={{color:t.txt2,fontSize:12}}>Recovery day</div>:preview.exercises.map((ex,i)=><ExRow key={i} t={t} name={ex.name} sets={ex.sets} reps={ex.reps} type={ex.type}/>)}{selLog&&selLog.note&&selLog.note!=='Recovery day'&&selLog.note!=='Retroactive log'&&(<div style={{marginTop:10,padding:'8px 10px',background:t.surface2,borderRadius:7,fontSize:11,color:t.txt2}}>📝 "{selLog.note}"</div>)}{!selLog&&sel<=dayNum&&!preview.isRest&&<div style={{fontSize:11,color:t.red,marginTop:8}}>⚠️ Not completed</div>}</Card>)}
    </Scr>
  );
};

// ─── LIBRARY ──────────────────────────────────────────────────────────────────
const LibraryView: React.FC<{t:Theme;onBack:()=>void}> = ({t,onBack}) => {
  const [sel,setSel]=useState<string|null>(null);
  const [q,setQ]=useState('');
  const names=Object.keys(DB).filter(n=>n.toLowerCase().includes(q.toLowerCase()));
  if(sel){const db=DB[sel];return(<Scr t={t}><div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}><Btn t={t} variant='ghost' onClick={()=>setSel(null)}>← Back</Btn><div style={{fontSize:14,fontWeight:900,letterSpacing:2}}>GUIDE</div></div><div style={{fontSize:24,fontWeight:900,marginBottom:3}}>{sel}</div><div style={{fontSize:12,color:t.blue,marginBottom:16}}>🎯 {db.muscle}</div><Lbl t={t} color={t.blue}>TECHNIQUE TIPS</Lbl>{db.tips.map((tip,i)=>(<div key={i} style={{display:'flex',gap:8,padding:'8px 0',borderBottom:`1px solid ${t.border}`,fontSize:12,color:t.txt2,lineHeight:1.4}}><div style={{background:`${t.blue}20`,color:t.blue,borderRadius:4,minWidth:20,height:20,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700}}>{i+1}</div>{tip}</div>))}<Lbl t={t} color={t.blue} style={{marginTop:16}}>BREATHING</Lbl><div style={{background:t.isDark?'#08101E':'#EBF4FF',border:`1px solid ${t.blue}20`,borderRadius:9,padding:'10px 12px',fontSize:12,color:t.txt2,marginBottom:10}}>💨 {db.breathe}</div><Lbl t={t} color={t.blue}>EASIER MODIFICATION</Lbl><div style={{background:t.isDark?'#0F0E00':'#FFFBE6',border:`1px solid ${t.gold}20`,borderRadius:9,padding:'10px 12px',fontSize:12,color:t.txt2,marginBottom:24}}>🔄 {db.mod}</div></Scr>);}
  return(<Scr t={t}><div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}><Btn t={t} variant='ghost' onClick={onBack}>← Back</Btn><div style={{fontSize:14,fontWeight:900,letterSpacing:2}}>EXERCISES</div></div><input style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:9,color:t.txt,fontSize:13,padding:'9px 12px',width:'100%',boxSizing:'border-box',fontFamily:'inherit',marginBottom:10}} placeholder='Search exercises...' value={q} onChange={e=>setQ(e.target.value)}/>{names.map(n=>(<div key={n} onClick={()=>setSel(n)} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'11px 0',borderBottom:`1px solid ${t.border}`,cursor:'pointer'}}><div><div style={{fontSize:13,fontWeight:600}}>{n}</div><div style={{fontSize:10,color:t.txt2,marginTop:2}}>{DB[n].muscle}</div></div><span style={{color:t.blue,fontSize:16}}>›</span></div>))}</Scr>);
};

// ─── SETTINGS ─────────────────────────────────────────────────────────────────
const SettingsView: React.FC<{t:Theme;data:AppData;settings:Settings;onSave:(s:Settings)=>void;onReset:()=>void;onBack:()=>void}> = ({t,data,settings,onSave,onReset,onBack}) => {
  const [s,setS]=useState<Settings>(settings);
  const [sd,setSd]=useState(data.startDate||new Date().toISOString().split('T')[0]);
  const upd=(k:keyof Settings,v:any)=>setS(prev=>({...prev,[k]:v}));
  return(
    <Scr t={t}>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}><Btn t={t} variant='ghost' onClick={onBack}>← Back</Btn><div style={{fontSize:14,fontWeight:900,letterSpacing:2}}>SETTINGS</div></div>
      <Lbl t={t} color={t.blue}>PROGRAM</Lbl>
      <Card t={t} style={{padding:'12px 14px'}}>
        <div style={{padding:'8px 0',borderBottom:`1px solid ${t.border}`}}><div style={{fontSize:11,color:t.txt2,marginBottom:6}}>START DATE</div><input type='date' value={sd} onChange={e=>setSd(e.target.value)} style={{background:t.surface2,border:`1px solid ${t.border}`,borderRadius:8,color:t.txt,fontSize:13,padding:'8px 10px',width:'100%',fontFamily:'inherit',boxSizing:'border-box'}}/></div>
        <div style={{display:'flex',justifyContent:'space-between',padding:'8px 0',fontSize:12}}><span style={{color:t.txt}}>Theme</span><span style={{color:t.blue}}>Follows system ({t.isDark?'Dark':'Light'})</span></div>
      </Card>
      <Lbl t={t} color={t.blue}>WORKOUT</Lbl>
      <Card t={t} style={{padding:'12px 14px'}}>
        <div style={{padding:'8px 0',borderBottom:`1px solid ${t.border}`}}><div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:7}}><span>Default Rest Time</span><span style={{color:t.blue}}>{s.restTime}s</span></div><input type='range' min={30} max={120} step={15} value={s.restTime} onChange={e=>upd('restTime',Number(e.target.value))} style={{width:'100%',accentColor:t.blue}}/></div>
        <Toggle t={t} label='Haptic Feedback' value={s.haptics} onChange={v=>upd('haptics',v)}/>
        <Toggle t={t} label='Audio Cues' value={s.audio} onChange={v=>upd('audio',v)}/>
      </Card>
      <Lbl t={t} color={t.blue}>APPEARANCE</Lbl>
      <Card t={t} style={{padding:'12px 14px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0'}}><span style={{fontSize:12}}>Font Size</span><div style={{display:'flex',gap:5}}>{['normal','large'].map(f=><button key={f} onClick={()=>upd('fontSize',f)} style={{padding:'3px 10px',borderRadius:6,background:s.fontSize===f?t.blue:t.surface2,border:`1px solid ${t.border}`,color:s.fontSize===f?'#fff':t.txt2,fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>{f.toUpperCase()}</button>)}</div></div>
      </Card>
      <Lbl t={t} color={t.blue}>NOTIFICATIONS</Lbl>
      <Card t={t} style={{padding:'12px 14px'}}>
        <div style={{padding:'8px 0',borderBottom:`1px solid ${t.border}`}}><div style={{fontSize:11,color:t.txt2,marginBottom:6}}>DAILY REMINDER</div><input type='time' value={s.notifTime} onChange={e=>upd('notifTime',e.target.value)} style={{background:t.surface2,border:`1px solid ${t.border}`,borderRadius:8,color:t.txt,fontSize:13,padding:'8px 10px',fontFamily:'inherit'}}/></div>
        <Toggle t={t} label='Streak Alert' value={s.streakAlert} onChange={v=>upd('streakAlert',v)}/>
      </Card>
      <Btn t={t} onClick={()=>{saveData({...data,startDate:sd,settings:s});onSave(s);}}>SAVE SETTINGS</Btn>
      <Btn t={t} variant='danger' style={{marginTop:8}} onClick={onReset}>⚠ RESET ALL DATA</Btn>
    </Scr>
  );
};