import React from 'react';

export interface Theme {
  bg: string; surface: string; surface2: string;
  border: string; borderHi: string;
  blue: string; blueLt: string; blueDk: string; blueGlow: string;
  gold: string; green: string; red: string;
  txt: string; txt2: string; txt3: string; isDark: boolean;
}

export const DARK: Theme = {
  bg:'#0D0D2B', surface:'#13134A', surface2:'#1A1A5A',
  border:'#2A2A6A', borderHi:'#3BA5FF55',
  blue:'#3BA5FF', blueLt:'#00CFFF', blueDk:'#1E90FF', blueGlow:'#3BA5FF15',
  gold:'#FFD700', green:'#00FF88', red:'#FF5555',
  txt:'#FFFFFF', txt2:'#8B9DB0', txt3:'#3A4A6A', isDark:true,
};
export const LIGHT: Theme = {
  bg:'#EEF4FF', surface:'#FFFFFF', surface2:'#E0EAFF',
  border:'#C8D8F0', borderHi:'#3BA5FF66',
  blue:'#1E7FE8', blueLt:'#00AADD', blueDk:'#0057D9', blueGlow:'#1E7FE810',
  gold:'#C8800A', green:'#00A855', red:'#DD2222',
  txt:'#0A0A2A', txt2:'#5A6A8A', txt3:'#9AAAC0', isDark:false,
};

export const FONT = "'DM Mono','Courier New',monospace";

export const Logo: React.FC<{t:Theme;size?:number}> = ({t,size=40}) => {
  const g = `linear-gradient(135deg,${t.blueLt},${t.blueDk})`;
  return (
    <div style={{lineHeight:1}}>
      <span style={{fontSize:size,fontWeight:900,letterSpacing:-1,background:g,WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>MIKE</span>
      <span style={{fontSize:size*0.44,fontWeight:700,letterSpacing:1,background:`linear-gradient(135deg,${t.blue}99,${t.blueDk}99)`,WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text',marginLeft:5}}>2.0</span>
    </div>
  );
};

export const PBar: React.FC<{t:Theme;pct:number;h?:number;color?:string}> = ({t,pct,h=4,color}) => (
  <div style={{height:h,background:t.border,borderRadius:h/2,overflow:'hidden'}}>
    <div style={{height:'100%',width:`${Math.max(0,Math.min(100,pct))}%`,background:color||`linear-gradient(90deg,${t.blue},${t.blueLt})`,borderRadius:h/2,transition:'width 0.6s'}}/>
  </div>
);

export const Card: React.FC<{t:Theme;children:React.ReactNode;style?:React.CSSProperties;glow?:boolean}> = ({t,children,style={},glow=false}) => (
  <div style={{background:t.surface,borderRadius:14,padding:16,border:`1px solid ${glow?t.blue+'66':t.border}`,boxShadow:glow?`0 0 20px ${t.blueGlow}`:t.isDark?'none':'0 2px 8px #0001',marginBottom:12,...style}}>{children}</div>
);

export const Btn: React.FC<{t:Theme;children:React.ReactNode;variant?:string;style?:React.CSSProperties;onClick?:()=>void;disabled?:boolean}> = ({t,children,variant='primary',style={},onClick,disabled=false}) => {
  const base: React.CSSProperties = {width:'100%',padding:'13px',borderRadius:10,fontSize:12,fontWeight:900,letterSpacing:2,cursor:disabled?'not-allowed':'pointer',border:'none',fontFamily:FONT,marginTop:8,opacity:disabled?0.4:1};
  const v: Record<string,React.CSSProperties> = {
    primary:{background:t.blue,color:'#fff'},
    secondary:{background:t.surface2,color:t.txt,border:`1px solid ${t.borderHi}`},
    ghost:{background:'transparent',color:t.txt2,width:'auto',padding:'3px 0',marginTop:0},
    danger:{background:t.isDark?'#FF222220':'#FFEEEE',color:t.red,border:`1px solid ${t.red}44`},
  };
  return <button style={{...base,...(v[variant]||v.primary),...style}} onClick={disabled?undefined:onClick}>{children}</button>;
};

export const Lbl: React.FC<{t:Theme;children:React.ReactNode;color?:string;style?:React.CSSProperties}> = ({t,children,color,style={}}) => (
  <div style={{fontSize:9,color:color||t.txt2,letterSpacing:2,marginBottom:6,fontWeight:700,...style}}>{children}</div>
);

export const StatBox: React.FC<{t:Theme;label:string;value:number|string;color?:string}> = ({t,label,value,color}) => (
  <div style={{background:t.surface2,border:`1px solid ${t.border}`,borderRadius:10,padding:'10px 6px',textAlign:'center'}}>
    <div style={{fontSize:20,fontWeight:900,color:color||t.blue}}>{value}</div>
    <div style={{fontSize:8,color:t.txt2,letterSpacing:1,marginTop:2}}>{label}</div>
  </div>
);

export const ExRow: React.FC<{t:Theme;name:string;sets:number;reps:number|string;type:string}> = ({t,name,sets,reps,type}) => (
  <div style={{display:'flex',alignItems:'center',padding:'6px 0',borderBottom:`1px solid ${t.border}`}}>
    <div style={{width:5,height:5,borderRadius:3,background:t.blue,marginRight:8,flexShrink:0}}/>
    <span style={{flex:1,fontSize:12,color:t.txt}}>{name}</span>
    <span style={{fontSize:11,color:t.txt2,letterSpacing:1}}>{sets}×{type==='timed'?`${reps}s`:reps}</span>
  </div>
);

export const Scr: React.FC<{t:Theme;children:React.ReactNode;style?:React.CSSProperties}> = ({t,children,style={}}) => (
  <div style={{background:t.bg,color:t.txt,fontFamily:FONT,padding:'20px 16px 36px',display:'flex',flexDirection:'column',minHeight:'100vh',...style}}>{children}</div>
);

export const Toggle: React.FC<{t:Theme;label:string;value:boolean;onChange:(v:boolean)=>void}> = ({t,label,value,onChange}) => (
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:`1px solid ${t.border}`}}>
    <span style={{fontSize:12,color:t.txt}}>{label}</span>
    <div onClick={()=>onChange(!value)} style={{width:38,height:22,background:value?t.blue:t.border,borderRadius:11,position:'relative',cursor:'pointer',transition:'background 0.2s'}}>
      <div style={{position:'absolute',top:3,left:value?18:3,width:16,height:16,background:'#fff',borderRadius:8,transition:'left 0.2s'}}/>
    </div>
  </div>
);

export function useSystemTheme(): boolean {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const [dark, setDark] = React.useState<boolean>(mq.matches);
  React.useEffect(() => {
    const h = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);
  return dark;
}

export const fmt = (s: number): string => `${Math.floor(s/60)}:${String(Math.max(0,s)%60).padStart(2,'0')}`;
export const haptic = (p: number[] = [50]) => { try { (navigator as any).vibrate?.(p); } catch {} };

export function useAudio() {
  const ctx = React.useRef<AudioContext|null>(null);
  const gc = () => { if(!ctx.current) ctx.current = new (window.AudioContext || (window as any).webkitAudioContext)(); return ctx.current; };
  const beep = (freq=880,dur=0.1,vol=0.3) => { try { const ac=gc(),o=ac.createOscillator(),g=ac.createGain(); o.connect(g);g.connect(ac.destination); o.frequency.value=freq; g.gain.setValueAtTime(vol,ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+dur); o.start();o.stop(ac.currentTime+dur); } catch {} };
  return {
    countdown: () => beep(660,0.07,0.2),
    done: () => { beep(880,0.1,0.3); setTimeout(()=>beep(1100,0.15,0.3),160); },
    restOver: () => { beep(1100,0.1,0.3); setTimeout(()=>beep(1320,0.2,0.4),360); },
    pr: () => { [880,1100,1320,1540].forEach((f,i)=>setTimeout(()=>beep(f,0.12,0.4),i*100)); },
    milestone: () => { [660,880,1100,880,1100,1320].forEach((f,i)=>setTimeout(()=>beep(f,0.15,0.4),i*120)); },
  };
}

export function useWakeLock() {
  const lock = React.useRef<any>(null);
  return {
    acquire: async () => { try { if('wakeLock' in navigator) lock.current = await (navigator as any).wakeLock.request('screen'); } catch {} },
    release: () => { try { lock.current?.release(); lock.current = null; } catch {} },
  };
}
