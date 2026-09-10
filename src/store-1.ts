import {
  AppData, WorkoutSession, PRRecord, ExerciseLog, PreWorkoutCheckIn,
  UserProfile, GeneratedWorkout, TrainingState, ProgressPhoto, RawExerciseExecution,
} from './types';
import { loadAppData, saveAppData } from './persistence';
import { calcTrainingState, generateWorkout, getMesocyclePhase } from './training.engine';
import { buildAthleteModel } from './athlete.engine';
import { computeAdaptationState } from './fatigue.engine';
import { computeTransformation, calcSessionXP } from './transformation.engine';
import { computeAIState, recordDecisionOutcome } from './ai.engine';
import { computeAnalytics } from './analytics.engine';
import { updateGamification } from './gamification.engine';
import { EXERCISE_REGISTRY, EXERCISE_NAME_TO_ID } from './registry';

// ═══════════════════════════════════════════════════════════════════════════
// THE CLOSED LOOP:
// Workout → Log → Analytics → Athlete Model → Adaptation → AI Decision
// → Progression Decision → Workout Generator → Next Workout → Execution → repeat
// ═══════════════════════════════════════════════════════════════════════════

export function recomputeFullLoop(data: AppData, earnedXPThisSession = 0): AppData {
  const completedDays = Array.from(new Set(data.sessions.filter(s => !s.isRestDay && s.completionStatus === 'completed').map(s => s.calendarDay)));
  const completedWorkoutCount = data.sessions.filter(s => !s.isRestDay && s.completionStatus === 'completed').length;
  const trainingBase = calcTrainingState(data.profile.startDate, completedDays, completedWorkoutCount);

  const athleteModel = buildAthleteModel(
    data.athleteModel, data.sessions, data.prs, trainingBase.calendarDay,
    data.transformation?.overallScore ?? 0,
  );

  const adaptation = computeAdaptationState(
    data.sessions, athleteModel, trainingBase.mesocycleWeek, trainingBase.currentPhase, data.adaptation ?? null,
  );

  const analytics = computeAnalytics(data.sessions, data.prs);

  // Gamification runs BEFORE transformation: it evaluates achievement,
  // mission, challenge, and skill-unlock XP for this cycle and folds all of
  // it into one authoritative total. Transformation then reads that total,
  // so identityRank/level/rankProgress are never one cycle stale relative
  // to XP the UI just displayed as earned.
  const gamResult = updateGamification(
    data.gamification, data.sessions, data.prs, athleteModel, data.gamification.xp,
    trainingBase.calendarDay, trainingBase.weekNumber, trainingBase.isPost90,
    analytics.weeklyTrends, earnedXPThisSession,
  );

  const totalDays = trainingBase.calendarDay;
  const transformation = computeTransformation(
    data.sessions, data.prs, gamResult.state.xp, totalDays, athleteModel, data.transformation ?? null,
  );

  const { aiState, updatedMemory } = computeAIState(
    data.sessions, adaptation, transformation, data.prs, athleteModel, data.aiMemory, data.ai ?? null,
  );

  const nextWorkout = generateWorkout(trainingBase, data.profile.startDate, athleteModel, adaptation, aiState);
  const training: TrainingState = { ...trainingBase, nextWorkout };

  return {
    ...data, athleteModel, adaptation, transformation, ai: aiState,
    aiMemory: updatedMemory, analytics, gamification: gamResult.state, training,
  };
}

// ─── ADD WORKOUT SESSION (the trigger that runs the whole loop) ─────────────
export function commitWorkoutSession(
  data: AppData,
  rawExercises: RawExerciseExecution[],
  checkIn: PreWorkoutCheckIn,
  focus: string,
  note: string,
  durationMinutes: number,
  newPRValues: Record<string, number>,
): AppData {
  const trainingBase = calcTrainingState(
    data.profile.startDate,
    data.sessions.filter(s => !s.isRestDay && s.completionStatus !== 'partial' && s.completionStatus !== 'abandoned' && s.completionStatus !== 'retroactive').map(s => s.calendarDay),
    data.sessions.filter(s => !s.isRestDay && s.completionStatus !== 'partial' && s.completionStatus !== 'abandoned' && s.completionStatus !== 'retroactive').length,
  );

  const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;

  const exercises: ExerciseLog[] = rawExercises.map(re => {
    const exId = re.exerciseId || EXERCISE_NAME_TO_ID[re.exerciseName] || re.exerciseName.toLowerCase().replace(/\s+/g, '_');
    const ex = EXERCISE_REGISTRY[exId];
    const statuses = (re.executionStatus ?? []).slice(0, Math.max(re.sets, 0));
    const tags = (re.setTags ?? []).slice(0, Math.max(re.sets, 0));
    const reps = (re.repsPerSet ?? []).map(v => Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0).slice(0, Math.max(re.sets, 0));
    const durations = (re.durationsPerSet ?? []).map(v => Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0).slice(0, Math.max(re.sets, 0));
    const executionStatus = statuses.length === tags.length && statuses.length === (re.type === 'timed' ? durations.length : reps.length)
      ? statuses
      : tags.map(t => t === 'failed' ? 'failed' : 'completed');
    const completedValues = re.type === 'timed' ? durations : reps;
    const volumeProxy = completedValues.reduce((a,b) => a + b, 0);
    const goodTags = tags.filter(t => t === 'easy' || t === 'good').length;
    const hardTags = tags.filter(t => t === 'hard' || t === 'failed').length;
    const difficulty = tags.length > 0
      ? Math.round(3 + (hardTags / tags.length) * 5 - (goodTags / tags.length) * 2)
      : 5;

    return {
      exerciseId: exId,
      plannedExerciseId: re.plannedExerciseId,
      exerciseName: re.exerciseName,
      sets: Math.max(0, Math.round(re.sets)),
      repsPerSet: reps,
      durationsPerSet: re.type === 'timed' ? durations : undefined,
      type: re.type,
      primaryMuscle: ex?.primaryMuscles[0] ?? 'full',
      difficulty: Math.max(1, Math.min(10, difficulty)),
      setTags: tags as any,
      executionStatus,
      usedModification: Boolean(re.usedModification),
      modificationLabel: re.modificationLabel,
      targetReps: re.targetReps,
      targetDuration: re.targetDuration,
      volumeProxy,
    };
  });

  const totalVolume = exercises.reduce((a,e) => a + e.volumeProxy, 0);
  const plannedSets = exercises.reduce((a,e) => a + e.sets, 0);
  const recordedSets = exercises.reduce((a,e) => a + e.executionStatus.length, 0);
  const failedSets = exercises.reduce((a,e) => a + e.executionStatus.filter(s => s === 'failed').length, 0);
  const completionStatus = recordedSets === 0
    ? 'abandoned'
    : recordedSets >= plannedSets && failedSets < recordedSets
      ? 'completed'
      : 'partial';

  const session: WorkoutSession = {
    id: sessionId, date: new Date().toISOString(),
    programDay: trainingBase.programDay, calendarDay: trainingBase.calendarDay,
    weekNumber: trainingBase.weekNumber, mesocycleNumber: trainingBase.mesocycleNumber,
    mesocycleWeek: trainingBase.mesocycleWeek, phase: trainingBase.currentPhase,
    trainingPhase: trainingBase.trainingPhase, focus, exercises,
    preCheckIn: checkIn, totalVolume, estimatedLoad: totalVolume,
    durationMinutes: Math.max(0, Number.isFinite(durationMinutes) ? durationMinutes : 0), note, isRestDay: false,
    completionStatus,
    generatedByAI: (data.training.nextWorkout?.aiDecisionIds?.length ?? 0) > 0,
    wasDeloadActive: data.adaptation?.deloadActive ?? false,
    aiDecisionId: data.training.nextWorkout?.aiDecisionIds[0],
  };

  const prs: PRRecord[] = [...data.prs];
  for (const [exName, rawValue] of Object.entries(newPRValues)) {
    const value = Number(rawValue);
    if (!Number.isFinite(value) || value <= 0) continue;
    const exId = EXERCISE_NAME_TO_ID[exName] || exName.toLowerCase().replace(/\s+/g, '_');
    const idx = prs.findIndex(p => p.exerciseId === exId);
    const record: PRRecord = { exerciseId: exId, exerciseName: exName, value, date: session.date, calendarDay: trainingBase.calendarDay, sessionId };
    if (idx >= 0 && value > prs[idx].value) prs[idx] = record;
    else if (idx < 0) prs.push(record);
  }

  const isStreak = data.training.currentStreak > 0;
  const earnedXP = completionStatus === 'completed'
    ? calcSessionXP(session, Object.keys(newPRValues).length, isStreak)
    : 0;

  // Preserve every execution record. Same-day records are no longer silently overwritten.
  const sessions = [...data.sessions, session].sort((a,b) => a.calendarDay - b.calendarDay || a.date.localeCompare(b.date));

  let aiMemory = data.aiMemory;
  if (data.training.nextWorkout?.aiDecisionIds.length) {
    const outcome = completionStatus === 'completed' && failedSets === 0 ? 'success' : completionStatus === 'partial' ? 'neutral' : 'failure';
    for (const decisionId of data.training.nextWorkout.aiDecisionIds) {
      aiMemory = recordDecisionOutcome(aiMemory, decisionId, outcome, sessionId);
    }
  }

  const gamification = { ...data.gamification, xp: data.gamification.xp + earnedXP };
  const updated: AppData = { ...data, sessions, prs, aiMemory, gamification };
  return recomputeFullLoop(updated, earnedXP);
}

// ─── ADD REST/RECOVERY DAY ────────────────────────────────────────────────────
export function commitRestDay(data: AppData, note: string): AppData {
  const trainingBase = calcTrainingState(
    data.profile.startDate,
    data.sessions.filter(s => !s.isRestDay).map(s => s.calendarDay),
    data.sessions.filter(s => !s.isRestDay).length,
  );
  const session: WorkoutSession = {
    id: `rest_${Date.now()}`, date: new Date().toISOString(),
    programDay: trainingBase.programDay, calendarDay: trainingBase.calendarDay,
    weekNumber: trainingBase.weekNumber, mesocycleNumber: trainingBase.mesocycleNumber,
    mesocycleWeek: trainingBase.mesocycleWeek, phase: trainingBase.currentPhase,
    trainingPhase: trainingBase.trainingPhase, focus: 'Recovery', exercises: [],
    preCheckIn: { energy: 2, soreness: 1, timestamp: new Date().toISOString() },
    totalVolume: 0, estimatedLoad: 0, durationMinutes: 20, note,
    isRestDay: true, completionStatus: 'rest', generatedByAI: false, wasDeloadActive: data.adaptation?.deloadActive ?? false,
  };
  const sessions = data.sessions.filter(s => s.calendarDay !== trainingBase.calendarDay);
  sessions.push(session);
  return recomputeFullLoop({ ...data, sessions });
}

// ─── RETROACTIVE LOG ──────────────────────────────────────────────────────────
export function commitRetroactiveLog(data: AppData, calendarDay: number): AppData {
  const start = new Date(data.profile.startDate);
  start.setHours(0,0,0,0);
  const historicalDate = new Date(start);
  historicalDate.setDate(start.getDate() + calendarDay - 1);
  const isPost90 = calendarDay > 90;
  const week = Math.ceil(calendarDay / 7);
  const mesocycleNumber = isPost90 ? Math.floor((calendarDay - 91) / 28) + 2 : 1;
  const mesocycleWeek = isPost90 ? Math.floor(((calendarDay - 91) % 28) / 7) + 1 : ((week - 1) % 4) + 1;
  const phase = getMesocyclePhase(mesocycleWeek);
  const session: WorkoutSession = {
    id: `retro_${calendarDay}`, date: historicalDate.toISOString(),
    programDay: calendarDay, calendarDay, weekNumber: week,
    mesocycleNumber, mesocycleWeek, phase,
    trainingPhase: isPost90 ? 'infinite' : 'foundation',
    focus: 'Retroactive Log', exercises: [],
    preCheckIn: { energy: 2, soreness: 1, timestamp: new Date().toISOString() },
    totalVolume: 0, estimatedLoad: 0, durationMinutes: 0,
    note: 'Retroactively logged', isRestDay: false, completionStatus: 'retroactive', generatedByAI: false, wasDeloadActive: false,
  };
  const sessions = [...data.sessions.filter(s => s.calendarDay !== calendarDay), session];
  return recomputeFullLoop({ ...data, sessions });
}

// ─── PROGRESS PHOTOS ──────────────────────────────────────────────────────────
export function addProgressPhoto(data: AppData, photo: ProgressPhoto): AppData {
  const next = { ...data, progressPhotos: [...(data.progressPhotos ?? []), photo].sort((a,b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt)) };
  saveAppData(next);
  return next;
}

export function deleteProgressPhoto(data: AppData, photoId: string): AppData {
  const next = { ...data, progressPhotos: (data.progressPhotos ?? []).filter(p => p.id !== photoId) };
  saveAppData(next);
  return next;
}

// ─── UPDATE PROFILE ───────────────────────────────────────────────────────────
export function updateProfile(data: AppData, profile: Partial<UserProfile>): AppData {
  return recomputeFullLoop({ ...data, profile: { ...data.profile, ...profile } });
}

// ─── DISMISS INSIGHT ──────────────────────────────────────────────────────────
export function dismissInsight(data: AppData, insightId: string): AppData {
  if (!data.ai) return data;
  return { ...data, ai: { ...data.ai, insights: data.ai.insights.map(i => i.id === insightId ? { ...i, dismissed: true } : i) } };
}

// ─── OVERRIDE ADJUSTMENT ──────────────────────────────────────────────────────
export function overrideAdjustment(data: AppData, exerciseId: string): AppData {
  if (!data.ai) return data;
  const ai = { ...data.ai, nextWorkoutAdjustments: data.ai.nextWorkoutAdjustments.map(a => a.exerciseId === exerciseId ? { ...a, overridden: true } : a) };
  const updated = { ...data, ai };
  const trainingBase = calcTrainingState(updated.profile.startDate, updated.sessions.filter(s=>!s.isRestDay).map(s=>s.calendarDay), updated.sessions.filter(s=>!s.isRestDay).length);
  const nextWorkout = generateWorkout(trainingBase, updated.profile.startDate, updated.athleteModel, updated.adaptation ?? null, ai);
  return { ...updated, training: { ...updated.training, ...trainingBase, nextWorkout } };
}

// ─── INITIALIZE OR LOAD ───────────────────────────────────────────────────────
export function initStore(): AppData {
  const data = loadAppData();
  const computed = recomputeFullLoop(data);
  saveAppData(computed);
  return computed;
}

export function persistStore(data: AppData): void {
  saveAppData(data);
}
