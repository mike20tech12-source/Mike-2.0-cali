import {
  AthleteModel, WorkoutSession, PRRecord, ExerciseMastery,
  MuscleBalance, PlateauEvent, FitnessLevel, MuscleGroup,
} from './types';
import { EXERCISE_REGISTRY, EXERCISE_NAME_TO_ID, PROGRESSION_TREE } from './registry';

// ─── DEFAULT ATHLETE MODEL ────────────────────────────────────────────────────
export function createDefaultAthleteModel(userId: string, level: FitnessLevel): AthleteModel {
  return {
    userId,
    trainingAgeDays: 0,
    currentLevel: level,
    overallScore: 0,
    exerciseMastery: {},
    muscleBalance: { push: 0, pull: 0, legs: 0, core: 0, pushPullRatio: 1.0, overallBalance: 0 },
    progressionVelocity: 0,
    recoveryRate: 0.5,
    fatigueResponse: 0.5,
    plateauHistory: [],
    adaptationHistory: [],
    successfulAdaptations: [],
    failedAdaptations: [],
    weakPoints: [],
    strongPoints: [],
    unlockedSkills: [],
    avgEnergyBeforeWorkout: 2,
    avgSorenessBeforeWorkout: 1,
    optimalRestDays: 1,
    lastUpdated: new Date().toISOString(),
  };
}

// ─── UPDATE EXERCISE MASTERY ──────────────────────────────────────────────────
// Pure rebuild from raw session history every call. This function must be
// idempotent — calling it twice on the same sessions must produce the same
// result, since recomputeFullLoop runs after every commit and the raw
// sessions array (the actual source of truth) is what's re-scanned each
// time, not an incremental mutation of the previous derived state.
function updateExerciseMastery(
  existing: Record<string, ExerciseMastery>,
  sessions: WorkoutSession[],
  prs: PRRecord[],
): Record<string, ExerciseMastery> {
  const mastery: Record<string, ExerciseMastery> = {};
  const sorted = [...sessions].sort((a, b) => a.calendarDay - b.calendarDay);

  // Collect all exercise IDs that have ever been logged
  const exIds = new Set<string>();
  for (const s of sorted) for (const log of s.exercises) exIds.add(log.exerciseId);

  for (const exId of exIds) {
    const exSessions = sorted.filter(s => s.exercises.some(e => e.exerciseId === exId));
    if (exSessions.length === 0) continue;

    let bestReps = 0, bestDuration = 0, lastProgressed = exSessions[0].date;
    const repsHistory: number[] = [];
    const durationHistory: number[] = [];
    const difficultyHistory: number[] = [];

    for (const s of exSessions) {
      const log = s.exercises.find(e => e.exerciseId === exId)!;
      const sessionReps = log.repsPerSet.length > 0 ? Math.max(...log.repsPerSet) : 0;
      const sessionDuration = log.durationsPerSet && log.durationsPerSet.length > 0 ? Math.max(...log.durationsPerSet) : 0;
      if (sessionReps > bestReps) { bestReps = sessionReps; lastProgressed = s.date; }
      if (sessionDuration > bestDuration) { bestDuration = sessionDuration; lastProgressed = s.date; }
      repsHistory.push(sessionReps);
      durationHistory.push(sessionDuration);
      difficultyHistory.push(log.difficulty);
    }

    // PR records can reflect a higher "max" achieved outside a single logged
    // set (e.g. tap-counter totals) — fold those in as the ceiling too.
    const prForEx = prs.find(p => p.exerciseId === exId);
    if (prForEx) bestReps = Math.max(bestReps, prForEx.value);

    const recentReps = repsHistory.slice(-20);
    const recentDurations = durationHistory.slice(-20).filter(d => d > 0);
    const recentDiff = difficultyHistory.slice(-20);
    const averageReps = recentReps.reduce((a, b) => a + b, 0) / Math.max(recentReps.length, 1);
    const averageDuration = recentDurations.reduce((a, b) => a + b, 0) / Math.max(recentDurations.length, 1);
    const averageDifficulty = recentDiff.reduce((a, b) => a + b, 0) / Math.max(recentDiff.length, 1);

    const ex = EXERCISE_REGISTRY[exId];
    mastery[exId] = {
      exerciseId: exId,
      exerciseName: exSessions[exSessions.length - 1].exercises.find(e => e.exerciseId === exId)!.exerciseName,
      sessionsCompleted: exSessions.length,
      bestReps, bestDuration, averageReps, averageDuration, averageDifficulty,
      progressionLevel: ex?.progressionLevel ?? 1,
      isPlateaued: false, // set below
      lastProgressed,
      readyForProgression: false, // set below
      mastered: false, // set below
    };
  }

  // Evaluate mastery and progression readiness
  for (const exId of Object.keys(mastery)) {
    const m = mastery[exId];
    const node = PROGRESSION_TREE[exId];
    if (!node) continue;

    const threshold = node.masteryThreshold;
    const recentSessions = sorted
      .filter(s => s.exercises.some(e => e.exerciseId === exId))
      .slice(-threshold.consecutiveSessions);

    if (recentSessions.length < threshold.consecutiveSessions) {
      m.readyForProgression = false;
      continue;
    }

    let consecutiveGood = 0;
    for (const s of recentSessions) {
      const log = s.exercises.find(e => e.exerciseId === exId);
      if (!log) continue;

      const avgReps = log.repsPerSet.reduce((a,b) => a+b, 0) / Math.max(log.repsPerSet.length, 1);
      const goodTags = log.setTags.filter(t => t === 'easy' || t === 'good').length;
      const totalTags = log.setTags.filter(t => t !== '').length;
      const goodRatio = totalTags > 0 ? goodTags / totalTags : 0.5;

      const meetsReps = threshold.reps ? avgReps >= threshold.reps : true;
      const meetsDuration = threshold.duration ? (log.durationsPerSet?.[0] ?? 0) >= threshold.duration : true;
      const meetsQuality = goodRatio >= 0.6;

      if (meetsReps && meetsDuration && meetsQuality) consecutiveGood++;
    }

    m.readyForProgression = consecutiveGood >= threshold.consecutiveSessions;
    m.mastered = m.readyForProgression && m.sessionsCompleted >= threshold.consecutiveSessions * 2;
  }

  return mastery;
}

// ─── CALCULATE MUSCLE BALANCE ─────────────────────────────────────────────────
function calcMuscleBalance(sessions: WorkoutSession[]): MuscleBalance {
  if (sessions.length === 0) {
    return { push: 0, pull: 0, legs: 0, core: 0, pushPullRatio: 1.0, overallBalance: 0 };
  }

  const recent = sessions.filter(s => !s.isRestDay).slice(-28); // last 4 weeks
  const volume = { push: 0, pull: 0, legs: 0, core: 0 };

  for (const session of recent) {
    for (const log of session.exercises) {
      const v = log.volumeProxy;
      if (log.primaryMuscle === 'push' || log.primaryMuscle === 'full') volume.push += v * 0.4;
      if (log.primaryMuscle === 'pull' || log.primaryMuscle === 'full') volume.pull += v * 0.4;
      if (log.primaryMuscle === 'legs') volume.legs += v;
      if (log.primaryMuscle === 'core') volume.core += v;
      if (log.primaryMuscle === 'full') { volume.legs += v * 0.1; volume.core += v * 0.1; }
    }
  }

  const total = volume.push + volume.pull + volume.legs + volume.core || 1;
  const targets = { push: 0.28, pull: 0.32, legs: 0.22, core: 0.18 };
  const actual = {
    push: volume.push / total,
    pull: volume.pull / total,
    legs: volume.legs / total,
    core: volume.core / total,
  };

  const deviations = Object.keys(targets).map(k =>
    Math.abs(targets[k as keyof typeof targets] - actual[k as keyof typeof actual])
  );
  const overallBalance = Math.max(0, 1 - deviations.reduce((a,b) => a+b, 0) * 2);
  const pushPullRatio = volume.pull > 0 ? volume.push / volume.pull : 1.0;

  return {
    push: Math.round(volume.push),
    pull: Math.round(volume.pull),
    legs: Math.round(volume.legs),
    core: Math.round(volume.core),
    pushPullRatio: Math.round(pushPullRatio * 100) / 100,
    overallBalance: Math.round(overallBalance * 100) / 100,
  };
}

// ─── DETECT WEAK AND STRONG POINTS ───────────────────────────────────────────
function detectWeakStrong(
  balance: MuscleBalance,
  mastery: Record<string, ExerciseMastery>,
): { weak: MuscleGroup[]; strong: MuscleGroup[] } {
  const groups: ('push'|'pull'|'legs'|'core')[] = ['push', 'pull', 'legs', 'core'];
  const targets: Record<'push'|'pull'|'legs'|'core', number> = { push: 0.28, pull: 0.32, legs: 0.22, core: 0.18 };
  const total = balance.push + balance.pull + balance.legs + balance.core || 1;

  const actual: Record<'push'|'pull'|'legs'|'core', number> = {
    push: balance.push / total,
    pull: balance.pull / total,
    legs: balance.legs / total,
    core: balance.core / total,
  };

  const weak: MuscleGroup[] = [];
  const strong: MuscleGroup[] = [];

  for (const g of groups) {
    const deficit = targets[g] - actual[g];
    if (deficit > 0.08) weak.push(g);
    else if (deficit < -0.06) strong.push(g);
  }

  return { weak, strong };
}

// ─── DETECT PLATEAUS FROM HISTORY ────────────────────────────────────────────
export function detectPlateaus(
  sessions: WorkoutSession[],
  mastery: Record<string, ExerciseMastery>,
): PlateauEvent[] {
  const plateaus: PlateauEvent[] = [];
  const PLATEAU_SESSIONS = 6; // widened window, evaluated as smoothed halves below

  // Sessions logged during a deload phase have intentionally reduced
  // prescriptions (0.75x). Judging "no improvement" against deliberately
  // suppressed numbers would falsely re-flag a plateau and block the one
  // mechanism (increase_reps) that can ever resolve it — a deadlock where
  // deload causes the exact plateau signal that keeps deload active forever.
  const nonDeloadSessions = sessions.filter(s => !s.wasDeloadActive);

  for (const [exId, m] of Object.entries(mastery)) {
    if (m.sessionsCompleted < PLATEAU_SESSIONS) continue;

    const exSessions = nonDeloadSessions
      .filter(s => s.exercises.some(e => e.exerciseId === exId))
      .slice(-PLATEAU_SESSIONS);

    if (exSessions.length < PLATEAU_SESSIONS) continue;

    const repValues = exSessions.map(s => {
      const log = s.exercises.find(e => e.exerciseId === exId);
      if (!log) return 0;
      return log.repsPerSet.reduce((a,b) => a+b, 0) / Math.max(log.repsPerSet.length, 1);
    });

    // Compare the average of the first half vs the second half rather than
    // two single endpoints — a single noisy session (a bad night's sleep,
    // one "hard" set) shouldn't flip an otherwise-improving trend into a
    // false plateau.
    const mid = Math.floor(repValues.length / 2);
    const firstHalfAvg = repValues.slice(0, mid).reduce((a,b) => a+b, 0) / Math.max(mid, 1);
    const secondHalfAvg = repValues.slice(mid).reduce((a,b) => a+b, 0) / Math.max(repValues.length - mid, 1);
    const improvement = firstHalfAvg > 0 ? (secondHalfAvg - firstHalfAvg) / firstHalfAvg : 0;

    if (improvement <= 0.02 && m.sessionsCompleted >= PLATEAU_SESSIONS) {
      plateaus.push({
        exerciseId: exId,
        exerciseName: m.exerciseName,
        detectedAt: new Date().toISOString(),
        sessionCount: PLATEAU_SESSIONS,
      });
      mastery[exId].isPlateaued = true;
    }
  }

  return plateaus;
}

// ─── CALCULATE PROGRESSION VELOCITY ──────────────────────────────────────────
function calcProgressionVelocity(sessions: WorkoutSession[]): number {
  if (sessions.length < 4) return 0;
  const recent = sessions.filter(s => !s.isRestDay).slice(-8);
  let totalGain = 0;
  let comparisons = 0;

  // Compare first half vs second half
  const half = Math.floor(recent.length / 2);
  const early = recent.slice(0, half);
  const late = recent.slice(half);

  const earlyVol = early.reduce((a,s) => a + s.totalVolume, 0) / Math.max(early.length, 1);
  const lateVol  = late.reduce((a,s) => a + s.totalVolume, 0) / Math.max(late.length, 1);

  if (earlyVol > 0) {
    totalGain = (lateVol - earlyVol) / earlyVol;
    comparisons = 1;
  }

  return comparisons > 0 ? Math.round(totalGain * 100) / 100 : 0;
}

// ─── CALCULATE RECOVERY METRICS ───────────────────────────────────────────────
function calcRecoveryMetrics(sessions: WorkoutSession[]): {
  recoveryRate: number;
  fatigueResponse: number;
  avgEnergy: number;
  avgSoreness: number;
  optimalRestDays: number;
} {
  if (sessions.length < 3) {
    return { recoveryRate: 0.5, fatigueResponse: 0.5, avgEnergy: 2, avgSoreness: 1, optimalRestDays: 1 };
  }

  const recent = sessions.slice(-20);
  const avgEnergy   = recent.reduce((a,s) => a + s.preCheckIn.energy, 0) / recent.length;
  const avgSoreness = recent.reduce((a,s) => a + s.preCheckIn.soreness, 0) / recent.length;

  // Recovery rate: how quickly energy improves after high soreness days
  const highSorenessDays = recent.filter(s => s.preCheckIn.soreness >= 2);
  let recoveryRate = 0.5;
  if (highSorenessDays.length > 0) {
    const avgEnergyAfterSore = highSorenessDays.reduce((a,s) => a + s.preCheckIn.energy, 0) / highSorenessDays.length;
    recoveryRate = avgEnergyAfterSore / 3;
  }

  // Fatigue response: how much soreness affects performance
  const fatigueResponse = avgSoreness > 1.5 ? Math.min(avgSoreness / 3, 1) : 0.3;

  // Optimal rest days: estimate based on soreness patterns
  const optimalRestDays = avgSoreness >= 2 ? 2 : 1;

  return {
    recoveryRate: Math.round(recoveryRate * 100) / 100,
    fatigueResponse: Math.round(fatigueResponse * 100) / 100,
    avgEnergy: Math.round(avgEnergy * 10) / 10,
    avgSoreness: Math.round(avgSoreness * 10) / 10,
    optimalRestDays,
  };
}

// ─── MAIN: BUILD/UPDATE ATHLETE MODEL ────────────────────────────────────────
export function buildAthleteModel(
  existing: AthleteModel,
  sessions: WorkoutSession[],
  prs: PRRecord[],
  calendarDay: number,
  overallScore: number,
): AthleteModel {
  const updatedMastery = updateExerciseMastery(existing.exerciseMastery, sessions, prs);
  const muscleBalance  = calcMuscleBalance(sessions);
  const { weak, strong } = detectWeakStrong(muscleBalance, updatedMastery);
  const plateaus = detectPlateaus(sessions, updatedMastery);
  const progressionVelocity = calcProgressionVelocity(sessions);
  const recovery = calcRecoveryMetrics(sessions);

  // Update skill unlocks
  const unlockedSkills = [...existing.unlockedSkills];
  for (const [exId, m] of Object.entries(updatedMastery)) {
    if (m.mastered && !unlockedSkills.includes(exId)) {
      unlockedSkills.push(exId);
    }
  }

  // Determine level based on mastery
  const masteredCount = Object.values(updatedMastery).filter(m => m.mastered).length;
  let currentLevel: FitnessLevel = 'beginner';
  if (masteredCount >= 10) currentLevel = 'advanced';
  else if (masteredCount >= 5) currentLevel = 'intermediate';

  // Resolve any previously-open plateau whose exercise is no longer showing
  // the plateau condition (i.e. it's not in this cycle's fresh detection).
  // Without this, plateauCount only ever grows and eventually locks training
  // into permanent deload even after performance genuinely improves.
  const now = new Date().toISOString();
  const stillPlateaued = new Set(plateaus.map(p => p.exerciseId));
  const resolvedHistory = existing.plateauHistory.map(p =>
    (!p.resolvedAt && !stillPlateaued.has(p.exerciseId))
      ? { ...p, resolvedAt: now, resolution: 'Performance improved — plateau cleared' }
      : p
  );

  return {
    ...existing,
    trainingAgeDays: calendarDay,
    currentLevel,
    overallScore,
    exerciseMastery: updatedMastery,
    muscleBalance,
    progressionVelocity,
    recoveryRate: recovery.recoveryRate,
    fatigueResponse: recovery.fatigueResponse,
    plateauHistory: [
      ...resolvedHistory.filter(p => !plateaus.some(np => np.exerciseId === p.exerciseId)),
      ...plateaus,
    ],
    weakPoints: weak,
    strongPoints: strong,
    unlockedSkills,
    avgEnergyBeforeWorkout: recovery.avgEnergy,
    avgSorenessBeforeWorkout: recovery.avgSoreness,
    optimalRestDays: recovery.optimalRestDays,
    lastUpdated: new Date().toISOString(),
  };
}
