import {
  WorkoutSession, PRRecord, AnalyticsState, WeeklyMuscleVolume,
  ExerciseProgressionCurve, WeeklyTrend, FatigueDataPoint,
  CorrelationPoint, PhaseRecord, MesocycleRecord,
} from './types';

// ─── MUSCLE VOLUME ────────────────────────────────────────────────────────────
export function calcMuscleVolume(sessions: WorkoutSession[]): WeeklyMuscleVolume[] {
  const map = new Map<number, WeeklyMuscleVolume>();
  for (const s of sessions.filter(s => !s.isRestDay)) {
    const w = s.weekNumber;
    if (!map.has(w)) map.set(w, { weekNumber:w, push:0, pull:0, legs:0, core:0, total:0 });
    const entry = map.get(w)!;
    for (const e of s.exercises) {
      const v = e.volumeProxy;
      if (e.primaryMuscle === 'push') entry.push += v;
      else if (e.primaryMuscle === 'pull') entry.pull += v;
      else if (e.primaryMuscle === 'legs') entry.legs += v;
      else if (e.primaryMuscle === 'core') entry.core += v;
      else if (e.primaryMuscle === 'full') { entry.push += v*0.3; entry.pull += v*0.3; entry.legs += v*0.2; entry.core += v*0.2; }
      entry.total += v;
    }
  }
  return Array.from(map.values()).sort((a,b) => a.weekNumber - b.weekNumber)
    .map(v => ({ ...v, push:Math.round(v.push), pull:Math.round(v.pull), legs:Math.round(v.legs), core:Math.round(v.core), total:Math.round(v.total) }));
}

// ─── PROGRESSION CURVES ───────────────────────────────────────────────────────
export function calcProgressionCurves(sessions: WorkoutSession[]): ExerciseProgressionCurve[] {
  const exMap = new Map<string, { name:string; muscle:string; points:{date:string;day:number;val:number;sid:string}[] }>();
  for (const s of sessions.filter(s => !s.isRestDay)) {
    for (const e of s.exercises) {
      if (!exMap.has(e.exerciseId)) exMap.set(e.exerciseId, { name:e.exerciseName, muscle:e.primaryMuscle, points:[] });
      const avg = e.type === 'timed'
        ? (e.durationsPerSet?.reduce((a,b)=>a+b,0) ?? 0) / Math.max(e.durationsPerSet?.length??1,1)
        : e.repsPerSet.reduce((a,b)=>a+b,0) / Math.max(e.repsPerSet.length,1);
      if (avg > 0) exMap.get(e.exerciseId)!.points.push({ date:s.date, day:s.calendarDay, val:Math.round(avg*10)/10, sid:s.id });
    }
  }
  return Array.from(exMap.entries()).filter(([,v]) => v.points.length >= 2).map(([id, v]) => {
    const pts = v.points.sort((a,b) => a.day - b.day);
    const first = pts[0].val, last = pts[pts.length-1].val;
    const pctGain = first > 0 ? Math.round(((last-first)/first)*100) : 0;
    const recent3 = pts.slice(-3);
    let trend: 'improving'|'plateaued'|'declining' = 'plateaued';
    if (recent3.length >= 2) {
      const delta = recent3[recent3.length-1].val - recent3[0].val;
      if (delta > 0.5) trend = 'improving';
      else if (delta < -0.5) trend = 'declining';
    }
    return {
      exerciseId:id, exerciseName:v.name, muscleGroup:v.muscle as any,
      dataPoints: pts.map(p => ({ date:p.date, calendarDay:p.day, value:p.val, sessionId:p.sid })),
      trend, percentageGain:pctGain,
      masteryLevel: Math.min(Math.round((pts.length/20)*10), 10),
    };
  });
}

// ─── WEEKLY TRENDS ────────────────────────────────────────────────────────────
export function calcWeeklyTrends(sessions: WorkoutSession[], prs: PRRecord[]): WeeklyTrend[] {
  const map = new Map<number, WorkoutSession[]>();
  for (const s of sessions) {
    const w = s.weekNumber;
    if (!map.has(w)) map.set(w, []);
    map.get(w)!.push(s);
  }
  return Array.from(map.entries()).sort(([a],[b])=>a-b).map(([week, ws]) => {
    const workouts = ws.filter(s => !s.isRestDay);
    const weekPRs  = prs.filter(p => {
      const s = sessions.find(s => s.id === p.sessionId);
      return s?.weekNumber === week;
    });
    return {
      weekNumber: week,
      totalVolume: workouts.reduce((a,s)=>a+s.totalVolume,0),
      avgEnergy: ws.reduce((a,s)=>a+s.preCheckIn.energy,0)/Math.max(ws.length,1),
      avgSoreness: ws.reduce((a,s)=>a+s.preCheckIn.soreness,0)/Math.max(ws.length,1),
      completionRate: Math.round((workouts.length/Math.max(ws.length,1))*100),
      prCount: weekPRs.length,
      avgDifficulty: workouts.reduce((a,s)=>a+s.exercises.reduce((b,e)=>b+e.difficulty,0)/Math.max(s.exercises.length,1),0)/Math.max(workouts.length,1),
    };
  });
}

// ─── FATIGUE HISTORY ──────────────────────────────────────────────────────────
export function calcFatigueHistory(sessions: WorkoutSession[]): FatigueDataPoint[] {
  return sessions.slice(-30).map(s => ({
    date: s.date.split('T')[0],
    fatigueLevel: Math.round((s.preCheckIn.soreness/3)*5 + (1-s.preCheckIn.energy/3)*5),
    energy: s.preCheckIn.energy,
    soreness: s.preCheckIn.soreness,
  }));
}

// ─── CORRELATIONS ─────────────────────────────────────────────────────────────
export function calcSorenessVsPerformance(sessions: WorkoutSession[]): CorrelationPoint[] {
  return sessions.filter(s => !s.isRestDay && s.exercises.length > 0).map(s => ({
    date: s.date.split('T')[0],
    inputValue: s.preCheckIn.soreness,
    performanceValue: s.totalVolume,
    sessionId: s.id,
  }));
}

export function calcEnergyVsPerformance(sessions: WorkoutSession[]): CorrelationPoint[] {
  return sessions.filter(s => !s.isRestDay && s.exercises.length > 0).map(s => ({
    date: s.date.split('T')[0],
    inputValue: s.preCheckIn.energy,
    performanceValue: s.totalVolume,
    sessionId: s.id,
  }));
}

// ─── BEST WEEK ────────────────────────────────────────────────────────────────
export function findBestWeek(trends: WeeklyTrend[]): { week: number; volume: number } {
  if (!trends.length) return { week:1, volume:0 };
  const best = trends.reduce((a,t) => t.totalVolume > a.totalVolume ? t : a, trends[0]);
  return { week: best.weekNumber, volume: best.totalVolume };
}

// ─── PHASE HISTORY ────────────────────────────────────────────────────────────
export function calcPhaseHistory(sessions: WorkoutSession[]): PhaseRecord[] {
  const records: PhaseRecord[] = [];
  let cur: PhaseRecord | null = null;
  for (const s of sessions) {
    const phase = s.trainingPhase;
    if (!cur || cur.phase !== phase) {
      if (cur) records.push({ ...cur, endDay: s.calendarDay - 1 });
      cur = { phase, startDay: s.calendarDay, avgScore: s.totalVolume, totalVolume: s.totalVolume, prCount: 0 };
    } else {
      cur.totalVolume += s.totalVolume;
      cur.avgScore = (cur.avgScore + s.totalVolume) / 2;
    }
  }
  if (cur) records.push(cur);
  return records;
}

// ─── MESOCYCLE HISTORY ────────────────────────────────────────────────────────
export function calcMesocycleHistory(sessions: WorkoutSession[], prs: PRRecord[]): MesocycleRecord[] {
  const map = new Map<number, { sessions: WorkoutSession[]; deload: boolean }>();
  for (const s of sessions) {
    if (!map.has(s.mesocycleNumber)) map.set(s.mesocycleNumber, { sessions:[], deload:false });
    const e = map.get(s.mesocycleNumber)!;
    e.sessions.push(s);
    if (s.phase === 'deload') e.deload = true;
  }
  return Array.from(map.entries()).sort(([a],[b])=>a-b).map(([num, { sessions:ss, deload }]) => {
    const workouts = ss.filter(s => !s.isRestDay);
    const mPRs = prs.filter(p => ss.some(s => s.id === p.sessionId));
    return {
      number: num,
      phase: ss[ss.length-1]?.phase ?? 'build',
      startDate: ss[0]?.date ?? '',
      endDate: ss[ss.length-1]?.date,
      avgVolume: workouts.reduce((a,s)=>a+s.totalVolume,0)/Math.max(workouts.length,1),
      prCount: mPRs.length,
      deloadTriggered: deload,
    };
  });
}

// ─── MAIN ANALYTICS ───────────────────────────────────────────────────────────
export function computeAnalytics(sessions: WorkoutSession[], prs: PRRecord[]): AnalyticsState {
  const muscleVolume         = calcMuscleVolume(sessions);
  const progressionCurves    = calcProgressionCurves(sessions);
  const weeklyTrends         = calcWeeklyTrends(sessions, prs);
  const fatigueHistory       = calcFatigueHistory(sessions);
  const sorenessVsPerformance= calcSorenessVsPerformance(sessions);
  const energyVsPerformance  = calcEnergyVsPerformance(sessions);
  const { week, volume }     = findBestWeek(weeklyTrends);
  const phaseHistory         = calcPhaseHistory(sessions);
  const mesocycleHistory     = calcMesocycleHistory(sessions, prs);
  return {
    muscleVolume, progressionCurves, weeklyTrends, fatigueHistory,
    sorenessVsPerformance, energyVsPerformance,
    bestWeek: week, bestWeekVolume: volume,
    phaseHistory, mesocycleHistory, prHistory: prs,
  };
}
