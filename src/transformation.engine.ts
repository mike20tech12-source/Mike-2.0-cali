import {
  WorkoutSession, PRRecord, TransformationState, IdentityRank,
  RANK_THRESHOLDS, XP_PER_LEVEL, AthleteModel,
} from './types';

// ─── RANK FROM XP ─────────────────────────────────────────────────────────────
export function getRank(xp: number): IdentityRank {
  const entries = Object.entries(RANK_THRESHOLDS) as [IdentityRank, number][];
  for (let i = entries.length - 1; i >= 0; i--) {
    if (xp >= entries[i][1]) return entries[i][0];
  }
  return 'Beginner';
}

export function getRankProgress(xp: number): number {
  const rank = getRank(xp);
  const ranks = Object.keys(RANK_THRESHOLDS) as IdentityRank[];
  const idx = ranks.indexOf(rank);
  if (idx === ranks.length - 1) return 100;
  const current = RANK_THRESHOLDS[rank];
  const next = RANK_THRESHOLDS[ranks[idx + 1]];
  return Math.round(((xp - current) / (next - current)) * 100);
}

export function getLevel(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

// ─── XP PER SESSION ───────────────────────────────────────────────────────────
export function calcSessionXP(
  session: WorkoutSession,
  newPRCount: number,
  isStreak: boolean,
): number {
  let xp = 50; // base
  xp += Math.min(session.totalVolume * 0.05, 100); // volume bonus capped at 100
  xp += newPRCount * 75;
  xp += session.preCheckIn.energy >= 2 ? 10 : 0;
  xp += isStreak ? 20 : 0;
  xp += session.exercises.flatMap(e => e.setTags).filter(t => t === 'easy').length * 5;
  if (session.phase === 'peak') xp += 25;
  if (session.note && session.note.length > 10) xp += 10;
  return Math.round(xp);
}

// ─── STRENGTH INDEX (35%) ─────────────────────────────────────────────────────
function calcStrengthIndex(sessions: WorkoutSession[], prs: PRRecord[]): number {
  if (!sessions.length) return 0;
  const prScore = Math.min(prs.length * 3, 40);
  const recent = sessions.filter(s => !s.isRestDay).slice(-10);
  const avgDiff = recent.reduce((a,s) => {
    const d = s.exercises.reduce((b,e) => b + e.difficulty, 0) / Math.max(s.exercises.length, 1);
    return a + d;
  }, 0) / Math.max(recent.length, 1);
  const diffScore = Math.min((avgDiff / 10) * 40, 40);
  const volumeScore = Math.min(recent.reduce((a,s) => a + s.totalVolume, 0) / Math.max(recent.length, 1) / 200 * 20, 20);
  return Math.min(Math.round(prScore + diffScore + volumeScore), 100);
}

// ─── CONSISTENCY INDEX (25%) ──────────────────────────────────────────────────
function calcConsistencyIndex(sessions: WorkoutSession[], totalDays: number): number {
  if (!totalDays) return 0;
  const workouts = sessions.filter(s => !s.isRestDay).length;
  const expectedWorkouts = Math.round(totalDays * (6 / 7));
  const completionRate = Math.min(workouts / Math.max(expectedWorkouts, 1), 1);

  // Streak bonus
  const dates = sessions.map(s => s.date.split('T')[0]).sort();
  let maxStreak = 0, cur = 0;
  for (let i = 0; i < dates.length; i++) {
    if (i === 0) { cur = 1; continue; }
    const diff = (new Date(dates[i]).getTime() - new Date(dates[i-1]).getTime()) / 86400000;
    cur = diff <= 2 ? cur + 1 : 1;
    maxStreak = Math.max(maxStreak, cur);
  }
  const streakBonus = Math.min(maxStreak * 1.5, 20);
  return Math.min(Math.round(completionRate * 80 + streakBonus), 100);
}

// ─── PHYSIQUE SCORE (20%) — performance proxies ───────────────────────────────
function calcPhysiqueScore(sessions: WorkoutSession[], athleteModel: AthleteModel | null): number {
  if (sessions.length < 5) return 0;
  const TIMED = ['plank','hollow_hold','wall_sit','dead_hang','lsit','handstand_wall_hold'];
  const early  = sessions.filter(s => !s.isRestDay).slice(0, Math.min(12, sessions.length));
  const recent = sessions.filter(s => !s.isRestDay).slice(-12);

  const earlyVol  = early.reduce((a,s) => a + s.totalVolume, 0) / Math.max(early.length, 1);
  const recentVol = recent.reduce((a,s) => a + s.totalVolume, 0) / Math.max(recent.length, 1);
  const volGain = earlyVol > 0 ? Math.min(((recentVol - earlyVol) / earlyVol) * 100, 60) : 0;

  let holdImprove = 0;
  for (const exId of TIMED) {
    const earlyLogs = early.flatMap(s => s.exercises.filter(e => e.exerciseId === exId && (e.durationsPerSet?.length ?? 0) > 0));
    const recentLogs = recent.flatMap(s => s.exercises.filter(e => e.exerciseId === exId && (e.durationsPerSet?.length ?? 0) > 0));
    if (earlyLogs.length && recentLogs.length) {
      const ea = earlyLogs.reduce((a,e) => a + Math.max(...(e.durationsPerSet ?? [0])), 0) / earlyLogs.length;
      const ra = recentLogs.reduce((a,e) => a + Math.max(...(e.durationsPerSet ?? [0])), 0) / recentLogs.length;
      if (ea > 0) holdImprove += Math.min(((ra - ea) / ea) * 30, 20);
    }
  }

  const balanceBonus = athleteModel ? athleteModel.muscleBalance.overallBalance * 20 : 0;
  return Math.min(Math.round(Math.max(volGain * 0.4 + holdImprove + balanceBonus, 0)), 100);
}

// ─── PROGRESSION INDEX (20%) ──────────────────────────────────────────────────
function calcProgressionIndex(sessions: WorkoutSession[], athleteModel: AthleteModel | null): number {
  if (sessions.length < 3) return 0;
  const recent = sessions.filter(s => !s.isRestDay).slice(-8);
  let progressCount = 0, total = 0;

  for (let i = 1; i < recent.length; i++) {
    for (const ex of recent[i].exercises) {
      const prev = recent[i-1].exercises.find(e => e.exerciseId === ex.exerciseId);
      if (!prev) continue;
      total++;
      const currAvg = ex.repsPerSet.reduce((a,b) => a+b, 0) / Math.max(ex.repsPerSet.length, 1);
      const prevAvg = prev.repsPerSet.reduce((a,b) => a+b, 0) / Math.max(prev.repsPerSet.length, 1);
      if (currAvg >= prevAvg) progressCount++;
    }
  }

  const velocityBonus = athleteModel ? Math.min(athleteModel.progressionVelocity * 20, 20) : 0;
  const masteryBonus  = athleteModel ? Math.min(Object.values(athleteModel.exerciseMastery).filter(m => m.mastered).length * 5, 20) : 0;
  const baseScore = total > 0 ? (progressCount / total) * 60 : 30;
  return Math.min(Math.round(baseScore + velocityBonus + masteryBonus), 100);
}

// ─── SCORE HISTORY ────────────────────────────────────────────────────────────
function updateScoreHistory(
  prev: { date: string; score: number }[],
  newScore: number,
): { date: string; score: number }[] {
  const today = new Date().toISOString().split('T')[0];
  const filtered = prev.filter(h => h.date !== today);
  return [...filtered, { date: today, score: newScore }].slice(-90);
}

// ─── MAIN COMPUTATION ─────────────────────────────────────────────────────────
export function computeTransformation(
  sessions: WorkoutSession[],
  prs: PRRecord[],
  xp: number,
  totalDays: number,
  athleteModel: AthleteModel | null,
  prev: TransformationState | null,
): TransformationState {
  const strengthIndex    = calcStrengthIndex(sessions, prs);
  const consistencyIndex = calcConsistencyIndex(sessions, totalDays);
  const physiqueScore    = calcPhysiqueScore(sessions, athleteModel);
  const progressionIndex = calcProgressionIndex(sessions, athleteModel);

  const overallScore = Math.round(
    strengthIndex    * 0.35 +
    consistencyIndex * 0.25 +
    physiqueScore    * 0.20 +
    progressionIndex * 0.20,
  );

  const identityRank = getRank(xp);
  const level        = getLevel(xp);
  const rankProgress = getRankProgress(xp);
  const scoreHistory = updateScoreHistory(prev?.scoreHistory ?? [], overallScore);

  return {
    overallScore, strengthIndex, consistencyIndex, physiqueScore, progressionIndex,
    identityRank, xp, level, rankProgress, scoreHistory,
    lastUpdated: new Date().toISOString(),
  };
}
