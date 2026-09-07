import React, { useState } from 'react';
import { Theme, Card, Lbl, StatBox, Btn } from './ui';
import {
  TransformationState, AIInsight, WorkoutAdjustment, WeakPoint,
  AdaptationState, AnalyticsState, GamificationState, IdentityRank,
  Mission, Challenge, Achievement, AthleteModel,
} from './types';

const RANK_COLORS: Record<IdentityRank, string> = { Beginner:'#6B7280', Improving:'#3BA5FF', Athlete:'#00FF88', Advanced:'#FFD700', Elite:'#FF6B35', Apex:'#FF3399' };
const RANK_ICONS:  Record<IdentityRank, string> = { Beginner:'🌱', Improving:'📈', Athlete:'💪', Advanced:'🎯', Elite:'⚡', Apex:'👑' };

// ─── SCORE CARD ────────────────────────────────────────────────────────────────
export const ScoreCard: React.FC<{ t: Theme; transformation: TransformationState }> = ({ t, transformation }) => {
  const [expanded, setExpanded] = useState(false);
  const { overallScore, strengthIndex, consistencyIndex, physiqueScore, progressionIndex, identityRank, xp, level, rankProgress } = transformation;
  const rankColor = RANK_COLORS[identityRank];
  const metrics = [
    { label:'STRENGTH', value:strengthIndex, weight:'35%', color:t.blue },
    { label:'CONSISTENCY', value:consistencyIndex, weight:'25%', color:t.green },
    { label:'PHYSIQUE', value:physiqueScore, weight:'20%', color:t.gold },
    { label:'PROGRESSION', value:progressionIndex, weight:'20%', color:'#FF6B35' },
  ];
  return (
    <Card t={t}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14}}>
        <div>
          <div style={{fontSize:9,color:t.txt2,letterSpacing:2,marginBottom:4}}>TRANSFORMATION SCORE</div>
          <div style={{display:'flex',alignItems:'baseline',gap:6}}>
            <div style={{fontSize:42,fontWeight:900,letterSpacing:-2,background:`linear-gradient(135deg,${t.blueLt},${t.blueDk})`,WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>{overallScore}</div>
            <div style={{fontSize:14,color:t.txt2}}>/100</div>
          </div>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:22}}>{RANK_ICONS[identityRank]}</div>
          <div style={{fontSize:13,fontWeight:900,color:rankColor,letterSpacing:1}}>{identityRank.toUpperCase()}</div>
          <div style={{fontSize:9,color:t.txt2}}>LVL {level} · {xp.toLocaleString()} XP</div>
        </div>
      </div>
      <div style={{marginBottom:14}}>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:9,color:t.txt2,marginBottom:4,letterSpacing:1}}><span>{identityRank}</span><span>{rankProgress}% to next rank</span></div>
        <div style={{height:6,background:t.border,borderRadius:3,overflow:'hidden'}}><div style={{height:'100%',width:`${rankProgress}%`,background:rankColor,borderRadius:3,transition:'width 0.6s'}}/></div>
      </div>
      <div style={{marginBottom:12}}><div style={{height:8,background:t.border,borderRadius:4,overflow:'hidden'}}><div style={{height:'100%',width:`${overallScore}%`,background:`linear-gradient(90deg,${t.blue},${t.blueLt})`,borderRadius:4,transition:'width 0.8s'}}/></div></div>
      <button onClick={()=>setExpanded(e=>!e)} style={{background:'transparent',border:'none',color:t.blue,fontSize:11,cursor:'pointer',fontFamily:'inherit',letterSpacing:1,padding:0,marginBottom:expanded?12:0}}>{expanded?'▲ HIDE BREAKDOWN':'▼ SEE BREAKDOWN'}</button>
      {expanded && (
        <div style={{borderTop:`1px solid ${t.border}`,paddingTop:12}}>
          {metrics.map(m => (
            <div key={m.label} style={{marginBottom:10}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:10,marginBottom:4}}><span style={{color:t.txt2,letterSpacing:1}}>{m.label} <span style={{color:t.txt3}}>({m.weight})</span></span><span style={{color:m.color,fontWeight:700}}>{m.value}</span></div>
              <div style={{height:5,background:t.border,borderRadius:3,overflow:'hidden'}}><div style={{height:'100%',width:`${m.value}%`,background:m.color,borderRadius:3,transition:'width 0.6s'}}/></div>
            </div>
          ))}
          <div style={{fontSize:10,color:t.txt3,marginTop:8,lineHeight:1.4}}>Physique score derived from volume trends and hold-time improvements — no measurements required.</div>
        </div>
      )}
    </Card>
  );
};

// ─── AI COACH CARD ─────────────────────────────────────────────────────────────
const INSIGHT_COLORS: Record<AIInsight['type'], string> = { progression:'#3BA5FF', plateau:'#FF6B35', recovery:'#00FF88', milestone:'#FFD700', weakness:'#FF5555', form:'#00CFFF', general:'#8B9DB0' };
const PRIORITY_DOT: Record<AIInsight['priority'], string> = { high:'#FF5555', medium:'#FFD700', low:'#3BA5FF' };

export const AICoachCard: React.FC<{
  t: Theme; insights: AIInsight[]; adjustments: WorkoutAdjustment[]; weakGroups: WeakPoint[];
  adaptation: AdaptationState | null; onDismiss: (id: string) => void; onOverride: (exId: string) => void;
}> = ({ t, insights, adjustments, weakGroups, adaptation, onDismiss, onOverride }) => {
  const [tab, setTab] = useState<'insights'|'adjustments'|'adaptation'>('insights');
  const active = insights.filter(i => !i.dismissed);
  return (
    <Card t={t}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
        <div><div style={{fontSize:9,color:t.txt2,letterSpacing:2,marginBottom:2}}>AI COACH</div><div style={{fontSize:15,fontWeight:900}}>Rule-Based Coach</div></div>
        <div style={{fontSize:9,color:t.txt3,textAlign:'right'}}>Deterministic<br/>No LLM</div>
      </div>
      <div style={{display:'flex',gap:4,marginBottom:14,background:t.surface2,borderRadius:10,padding:3}}>
        {(['insights','adjustments','adaptation'] as const).map(tb => (
          <button key={tb} onClick={()=>setTab(tb)} style={{flex:1,padding:'7px 4px',borderRadius:8,border:'none',background:tab===tb?t.blue:'transparent',color:tab===tb?'#fff':t.txt2,fontSize:9,fontWeight:700,letterSpacing:1,cursor:'pointer',fontFamily:'inherit'}}>{tb.toUpperCase()}</button>
        ))}
      </div>

      {tab === 'insights' && (
        <div>
          {active.length === 0 && <div style={{textAlign:'center',color:t.txt2,fontSize:12,padding:'16px 0'}}>No active insights. Keep training and the coach will analyze your patterns.</div>}
          {active.map(ins => <InsightCard key={ins.id} t={t} insight={ins} onDismiss={onDismiss}/>)}
        </div>
      )}

      {tab === 'adjustments' && (
        <div>
          {adjustments.length === 0 && <div style={{textAlign:'center',color:t.txt2,fontSize:12,padding:'16px 0'}}>No adjustments needed. Your training is on track.</div>}
          {adjustments.map(adj => <AdjustmentRow key={adj.exerciseId} t={t} adj={adj} onOverride={onOverride}/>)}
          {weakGroups.length > 0 && (
            <div style={{marginTop:12}}>
              <div style={{fontSize:9,color:t.txt2,letterSpacing:2,marginBottom:8}}>MUSCLE BALANCE</div>
              {weakGroups.map(wg => (
                <div key={wg.group} style={{background:t.isDark?'#1A0A00':'#FFF4E6',border:`1px solid ${t.gold}33`,borderRadius:10,padding:'10px 12px',marginBottom:8}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:12}}><span style={{fontWeight:700,textTransform:'capitalize',color:t.txt}}>{wg.group}</span><span style={{color:t.gold}}>-{wg.volumeDeficit}% below target</span></div>
                  <div style={{fontSize:11,color:t.txt2,marginTop:4}}>{wg.suggestion}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'adaptation' && adaptation && (
        <div>
          <div style={{background:adaptation.deloadActive?(t.isDark?'#0A1A0A':'#E8F8E8'):t.surface2,border:`1px solid ${adaptation.deloadActive?t.green:t.border}33`,borderRadius:10,padding:'10px 12px',marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:700,color:adaptation.deloadActive?t.green:t.txt}}>{adaptation.deloadActive?'📉 DELOAD ACTIVE':'✅ NORMAL TRAINING'}</div>
            {adaptation.deloadActive && <div style={{fontSize:11,color:t.txt2,marginTop:4}}>{adaptation.deloadReason}</div>}
            <div style={{fontSize:10,color:t.txt3,marginTop:4}}>Recovery state: {adaptation.recoveryState} · Readiness: {adaptation.trainingReadiness}%</div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
            {[
              {label:'FATIGUE', value:`${adaptation.fatigueLevel}/10`, color:adaptation.fatigueLevel>=7?t.red:adaptation.fatigueLevel>=4?t.gold:t.green},
              {label:'INTENSITY', value:`${Math.round(adaptation.globalDifficultyMultiplier*100)}%`, color:t.blue},
              {label:'STRONG STREAK', value:`${adaptation.consecutiveStrongSessions}`, color:t.green},
              {label:'PLATEAUS', value:`${adaptation.plateaus.length}`, color:adaptation.plateaus.length>0?t.gold:t.green},
            ].map(m => (
              <div key={m.label} style={{background:t.surface2,border:`1px solid ${t.border}`,borderRadius:10,padding:'10px 8px',textAlign:'center'}}>
                <div style={{fontSize:18,fontWeight:900,color:m.color}}>{m.value}</div>
                <div style={{fontSize:8,color:t.txt2,letterSpacing:1,marginTop:2}}>{m.label}</div>
              </div>
            ))}
          </div>
          {adaptation.log.length > 0 && (
            <div>
              <div style={{fontSize:9,color:t.txt2,letterSpacing:2,marginBottom:8}}>ADAPTATION LOG</div>
              {adaptation.log.slice(-6).reverse().map((ev,i) => (
                <div key={i} style={{display:'flex',gap:8,padding:'7px 0',borderBottom:`1px solid ${t.border}`,fontSize:11}}>
                  <div style={{width:6,height:6,borderRadius:3,background:ev.decision==='deload'?t.gold:ev.decision==='increase_difficulty'?t.green:t.blue,marginTop:4,flexShrink:0}}/>
                  <div><div style={{color:t.txt,marginBottom:2}}>{ev.reason}</div><div style={{color:t.txt3,fontSize:9}}>{new Date(ev.date).toLocaleDateString()} · {ev.previousValue} → {ev.newValue}</div></div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

const InsightCard: React.FC<{ t: Theme; insight: AIInsight; onDismiss: (id: string) => void }> = ({ t, insight, onDismiss }) => {
  const [showReason, setShowReason] = useState(false);
  const color = INSIGHT_COLORS[insight.type];
  return (
    <div style={{background:t.isDark?`${color}10`:`${color}08`,border:`1px solid ${color}33`,borderRadius:12,padding:12,marginBottom:8}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
        <div style={{display:'flex',gap:6,alignItems:'center'}}><div style={{width:6,height:6,borderRadius:3,background:PRIORITY_DOT[insight.priority],flexShrink:0,marginTop:2}}/><div style={{fontSize:12,fontWeight:700,color:t.txt}}>{insight.title}</div></div>
        <button onClick={()=>onDismiss(insight.id)} style={{background:'transparent',border:'none',color:t.txt3,fontSize:14,cursor:'pointer',lineHeight:1}}>✕</button>
      </div>
      <div style={{fontSize:12,color:t.txt2,lineHeight:1.5,marginBottom:8}}>{insight.message}</div>
      <button onClick={()=>setShowReason(r=>!r)} style={{background:'transparent',border:'none',color,fontSize:10,cursor:'pointer',fontFamily:'inherit',letterSpacing:1,padding:0}}>{showReason?'▲ HIDE WHY':'▼ WHY?'}</button>
      {showReason && <div style={{background:t.surface2,borderRadius:8,padding:'8px 10px',marginTop:8,fontSize:11,color:t.txt2,lineHeight:1.5}}>🧠 {insight.reasoning}</div>}
    </div>
  );
};

const AdjustmentRow: React.FC<{ t: Theme; adj: WorkoutAdjustment; onOverride: (exId: string) => void }> = ({ t, adj, onOverride }) => (
  <div style={{background:t.surface2,border:`1px solid ${t.border}`,borderRadius:10,padding:'10px 12px',marginBottom:8}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:4}}><div style={{fontSize:12,fontWeight:700,color:t.txt}}>{adj.exerciseName}</div><div style={{fontSize:10,color:t.blue}}>{adj.currentValue} → {adj.suggestedValue}</div></div>
    <div style={{fontSize:11,color:t.txt2,marginBottom:8}}>{adj.reason}</div>
    {!adj.overridden ? <button onClick={()=>onOverride(adj.exerciseId)} style={{background:'transparent',border:`1px solid ${t.border}`,borderRadius:6,color:t.txt2,fontSize:10,padding:'3px 10px',cursor:'pointer',fontFamily:'inherit'}}>Override (keep current)</button>
    : <div style={{fontSize:10,color:t.txt3}}>✓ Override applied — this adjustment will not be used in the next workout</div>}
  </div>
);

// ─── ANALYTICS CHARTS ──────────────────────────────────────────────────────────
const GROUP_COLORS: Record<string,string> = { push:'#3BA5FF', pull:'#00FF88', legs:'#FFD700', core:'#FF6B35' };

export const AnalyticsCharts: React.FC<{ t: Theme; analytics: AnalyticsState }> = ({ t, analytics }) => {
  const [chart, setChart] = useState<'volume'|'progression'|'fatigue'|'correlation'|'trends'>('volume');
  const [selEx, setSelEx] = useState<string|null>(null);
  const charts = [ {id:'volume',label:'VOLUME'},{id:'progression',label:'CURVES'},{id:'fatigue',label:'FATIGUE'},{id:'correlation',label:'CORREL'},{id:'trends',label:'TRENDS'} ] as const;

  return (
    <Card t={t}>
      <div style={{fontSize:9,color:t.txt2,letterSpacing:2,marginBottom:12}}>ANALYTICS ENGINE</div>
      <div style={{display:'flex',gap:4,marginBottom:16,background:t.surface2,borderRadius:10,padding:3,overflowX:'auto'}}>
        {charts.map(c => <button key={c.id} onClick={()=>setChart(c.id)} style={{flex:'1 0 auto',padding:'7px 6px',borderRadius:8,border:'none',background:chart===c.id?t.blue:'transparent',color:chart===c.id?'#fff':t.txt2,fontSize:9,fontWeight:700,letterSpacing:1,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>{c.label}</button>)}
      </div>

      {chart === 'volume' && (analytics.muscleVolume.length === 0 ? <Empty t={t}/> : (
        <div>
          <div style={{display:'flex',gap:12,marginBottom:14,flexWrap:'wrap'}}>{Object.entries(GROUP_COLORS).map(([g,c]) => <div key={g} style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:8,height:8,borderRadius:4,background:c}}/><span style={{fontSize:9,color:t.txt2,letterSpacing:1,textTransform:'uppercase'}}>{g}</span></div>)}</div>
          <div style={{display:'flex',gap:4,alignItems:'flex-end',height:120}}>
            {analytics.muscleVolume.slice(-8).map(week => {
              const max = Math.max(...analytics.muscleVolume.slice(-8).map(w=>w.total),1);
              const totalH = (week.total/max)*110;
              return (
                <div key={week.weekNumber} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
                  {week.weekNumber === analytics.bestWeek && <div style={{fontSize:9,color:t.gold}}>★</div>}
                  <div style={{width:'100%',height:totalH,borderRadius:'3px 3px 0 0',overflow:'hidden',display:'flex',flexDirection:'column-reverse'}}>
                    {(['push','pull','legs','core'] as const).map(g => { const h = week.total>0?(week[g]/week.total)*totalH:0; return <div key={g} style={{height:h,background:GROUP_COLORS[g],flexShrink:0}}/>; })}
                  </div>
                  <div style={{fontSize:8,color:t.txt3}}>W{week.weekNumber}</div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {chart === 'progression' && (analytics.progressionCurves.length === 0 ? <Empty t={t}/> : (
        selEx ? (() => {
          const curve = analytics.progressionCurves.find(c => c.exerciseId === selEx);
          if (!curve) return <Empty t={t}/>;
          const pts = curve.dataPoints;
          const max = Math.max(...pts.map(p=>p.value),1), min = Math.min(...pts.map(p=>p.value),0), range = max-min||1;
          return (
            <div>
              <button onClick={()=>setSelEx(null)} style={{background:'transparent',border:'none',color:t.blue,fontSize:11,cursor:'pointer',fontFamily:'inherit',marginBottom:12,padding:0}}>← All exercises</button>
              <div style={{fontSize:14,fontWeight:900,marginBottom:2}}>{curve.exerciseName}</div>
              <div style={{display:'flex',gap:12,marginBottom:14}}><span style={{fontSize:11,color:curve.trend==='improving'?t.green:curve.trend==='declining'?t.red:t.gold}}>{curve.trend==='improving'?'↑':curve.trend==='declining'?'↓':'→'} {curve.trend}</span><span style={{fontSize:11,color:curve.percentageGain>=0?t.green:t.red}}>{curve.percentageGain>=0?'+':''}{curve.percentageGain}% total gain</span></div>
              <svg width="100%" height="100" viewBox={`0 0 ${pts.length*20} 100`} preserveAspectRatio="none">
                {pts.length > 1 && <polyline points={pts.map((p,i)=>`${i*20+10},${100-((p.value-min)/range)*90}`).join(' ')} fill="none" stroke={t.blue} strokeWidth="2" strokeLinejoin="round"/>}
                {pts.map((p,i) => <circle key={i} cx={i*20+10} cy={100-((p.value-min)/range)*90} r="3" fill={t.blue}/>)}
              </svg>
            </div>
          );
        })() : (
          <div>
            {analytics.progressionCurves.slice(0,8).map(c => (
              <div key={c.exerciseId} onClick={()=>setSelEx(c.exerciseId)} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 0',borderBottom:`1px solid ${t.border}`,cursor:'pointer'}}>
                <div><div style={{fontSize:12,fontWeight:600,color:t.txt}}>{c.exerciseName}</div><div style={{fontSize:10,color:t.txt2,marginTop:2,textTransform:'uppercase'}}>{c.muscleGroup}</div></div>
                <div style={{textAlign:'right'}}><div style={{fontSize:12,color:c.trend==='improving'?t.green:c.trend==='declining'?t.red:t.gold,fontWeight:700}}>{c.trend==='improving'?'↑':c.trend==='declining'?'↓':'→'} {c.trend}</div><div style={{fontSize:10,color:c.percentageGain>=0?t.green:t.red}}>{c.percentageGain>=0?'+':''}{c.percentageGain}%</div></div>
              </div>
            ))}
          </div>
        )
      ))}

      {chart === 'fatigue' && (analytics.fatigueHistory.length === 0 ? <Empty t={t}/> : (
        <div>
          <div style={{display:'flex',gap:3,alignItems:'flex-end',height:80}}>
            {analytics.fatigueHistory.slice(-14).map((h,i) => { const max=10; const barH=Math.max(4,(h.fatigueLevel/max)*72); const color=h.fatigueLevel>=7?t.red:h.fatigueLevel>=4?t.gold:t.green; return <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3}}><div style={{width:'100%',height:barH,background:color,borderRadius:'2px 2px 0 0'}}/><div style={{fontSize:7,color:t.txt3}}>{h.date.slice(5)}</div></div>; })}
          </div>
        </div>
      ))}

      {chart === 'correlation' && (
        <div>
          <Lbl t={t} color={t.blue}>SORENESS VS PERFORMANCE</Lbl>
          <div style={{fontSize:11,color:t.txt2,marginBottom:12,lineHeight:1.5}}>Each point is one workout — higher soreness generally correlates with lower training volume.</div>
          <svg width="100%" height="100" viewBox="0 0 100 100">
            {analytics.sorenessVsPerformance.slice(-20).map((p,i) => {
              const x = (p.inputValue/3)*90+5;
              const maxPerf = Math.max(...analytics.sorenessVsPerformance.map(pp=>pp.performanceValue),1);
              const y = 95-(p.performanceValue/maxPerf)*85;
              return <circle key={i} cx={x} cy={y} r="2" fill={t.blue} opacity="0.6"/>;
            })}
          </svg>
        </div>
      )}

      {chart === 'trends' && (analytics.weeklyTrends.length === 0 ? <Empty t={t}/> : (
        <div>
          <div style={{display:'flex',gap:4,alignItems:'flex-end',height:90,marginBottom:10}}>
            {analytics.weeklyTrends.slice(-8).map(tr => { const max=Math.max(...analytics.weeklyTrends.slice(-8).map(t2=>t2.totalVolume),1); const h=Math.max(4,(tr.totalVolume/max)*82); return (
              <div key={tr.weekNumber} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>{tr.weekNumber===analytics.bestWeek&&<div style={{fontSize:9,color:t.gold}}>★</div>}<div style={{width:'100%',height:h,background:tr.weekNumber===analytics.bestWeek?t.gold:`linear-gradient(180deg,${t.blue},${t.blueDk})`,borderRadius:'3px 3px 0 0'}}/><div style={{fontSize:8,color:t.txt3}}>W{tr.weekNumber}</div></div>
            );})}
          </div>
          {analytics.weeklyTrends.slice(-8).map(tr => (
            <div key={tr.weekNumber} style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}><div style={{fontSize:9,color:t.txt2,width:32}}>W{tr.weekNumber}</div><div style={{flex:1,height:6,background:t.border,borderRadius:3,overflow:'hidden'}}><div style={{height:'100%',width:`${tr.completionRate}%`,background:tr.completionRate>=80?t.green:tr.completionRate>=50?t.gold:t.red,borderRadius:3}}/></div><div style={{fontSize:9,color:t.txt2,width:28,textAlign:'right'}}>{tr.completionRate}%</div></div>
          ))}
        </div>
      ))}
    </Card>
  );
};

const Empty: React.FC<{t:Theme}> = ({t}) => <div style={{textAlign:'center',padding:'24px 0',color:t.txt2,fontSize:12,lineHeight:1.5}}><div style={{fontSize:32,marginBottom:8}}>📊</div>Complete more workouts to unlock this view</div>;

// ─── GAMIFICATION CARD (Missions + Challenges) ────────────────────────────────
export const GamificationCard: React.FC<{ t: Theme; gamification: GamificationState }> = ({ t, gamification }) => {
  const [tab, setTab] = useState<'missions'|'challenges'|'achievements'>('missions');
  const activeMissions = gamification.missions.filter(m => m.status === 'active');
  const activeChallenges = gamification.challenges.filter(c => !c.completed);
  const unlockedAch = gamification.achievements.filter(a => a.unlocked);

  return (
    <Card t={t}>
      <div style={{fontSize:9,color:t.txt2,letterSpacing:2,marginBottom:12}}>MISSIONS & GOALS</div>
      <div style={{display:'flex',gap:4,marginBottom:14,background:t.surface2,borderRadius:10,padding:3}}>
        {(['missions','challenges','achievements'] as const).map(tb => <button key={tb} onClick={()=>setTab(tb)} style={{flex:1,padding:'7px 4px',borderRadius:8,border:'none',background:tab===tb?t.blue:'transparent',color:tab===tb?'#fff':t.txt2,fontSize:9,fontWeight:700,letterSpacing:1,cursor:'pointer',fontFamily:'inherit'}}>{tb.toUpperCase()}</button>)}
      </div>

      {tab === 'missions' && (
        <div>
          {activeMissions.length === 0 && <div style={{textAlign:'center',color:t.txt2,fontSize:12,padding:'12px 0'}}>No active missions right now.</div>}
          {activeMissions.map(m => (
            <div key={m.id} style={{background:t.surface2,borderRadius:10,padding:'10px 12px',marginBottom:8}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}><div style={{fontSize:12,fontWeight:700,color:t.txt}}>{m.icon} {m.title}</div><div style={{fontSize:10,color:t.gold}}>+{m.xpReward} XP</div></div>
              <div style={{fontSize:11,color:t.txt2,marginBottom:6}}>{m.description}</div>
              <div style={{display:'flex',alignItems:'center',gap:8}}><div style={{flex:1,height:5,background:t.border,borderRadius:3,overflow:'hidden'}}><div style={{height:'100%',width:`${Math.min(100,(m.current/m.target)*100)}%`,background:t.blue,borderRadius:3}}/></div><div style={{fontSize:9,color:t.txt2}}>{m.current}/{m.target}</div></div>
            </div>
          ))}
        </div>
      )}

      {tab === 'challenges' && (
        <div>
          {activeChallenges.length === 0 && <div style={{textAlign:'center',color:t.txt2,fontSize:12,padding:'12px 0'}}>No active challenges.</div>}
          {activeChallenges.map(c => (
            <div key={c.id} style={{background:t.isDark?'#0F0E00':'#FFFBE6',border:`1px solid ${t.gold}22`,borderRadius:10,padding:'10px 12px',marginBottom:8}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}><div style={{fontSize:12,fontWeight:700,color:t.txt}}>{c.icon} {c.title}</div><div style={{fontSize:10,color:t.gold}}>+{c.xpReward} XP</div></div>
              <div style={{fontSize:11,color:t.txt2,marginBottom:6}}>{c.description}</div>
              <div style={{display:'flex',alignItems:'center',gap:8}}><div style={{flex:1,height:5,background:t.border,borderRadius:3,overflow:'hidden'}}><div style={{height:'100%',width:`${Math.min(100,(c.current/c.target)*100)}%`,background:t.gold,borderRadius:3}}/></div><div style={{fontSize:9,color:t.txt2}}>{c.current}/{c.target}</div></div>
            </div>
          ))}
        </div>
      )}

      {tab === 'achievements' && (
        <div>
          {unlockedAch.length === 0 && <div style={{textAlign:'center',color:t.txt2,fontSize:12,padding:'12px 0'}}>No achievements unlocked yet.</div>}
          {unlockedAch.map(a => (
            <div key={a.id} style={{display:'flex',gap:10,padding:'8px 0',borderBottom:`1px solid ${t.border}`}}>
              <div style={{fontSize:20}}>{a.icon}</div>
              <div><div style={{fontSize:12,fontWeight:700,color:t.txt}}>{a.title}</div><div style={{fontSize:10,color:t.txt2}}>{a.description}</div></div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
