import {
  AppData, SCHEMA_VERSION, UserProfile, WorkoutSession, ExerciseLog,
  AthleteModel, AIMemory, GamificationState, TrainingState, PRRecord,
  AppSettings, MuscleGroup,
} from './types';
import { createDefaultAthleteModel } from './athlete.engine';
import { createDefaultAchievements } from './gamification.engine';
import { EXERCISE_NAME_TO_ID, EXERCISE_REGISTRY } from './registry';
import { calcTrainingState } from './training.engine';

const STORAGE_KEY = 'mike2_appdata_v3';
const LEGACY_KEY_V1 = 'mike2v1';
const LEGACY_KEY_V2 = 'mike2_store_v1';

// ─── DEFAULTS ─────────────────────────────────────────────────────────────────
const DEFAULT_SETTINGS: AppSettings = {
  restTime: 60, haptics: true, audio: true, notifTime: '07:00',
  fontSize: 'normal', streakAlert: true, chatEnabled: true, floatingChatVisible: true,
};

export function createDefaultAppData(): AppData {
  const now = new Date().toISOString();
  const startDate = now.split('T')[0];
  const profile: UserProfile = {
    id: `user_${Date.now()}`,
    startDate, fitnessLevel: 'intermediate', onboarded: false,
    settings: DEFAULT_SETTINGS, createdAt: now,
  };
  return {
    schemaVersion: SCHEMA_VERSION,
    profile,
    sessions: [],
    prs: [],
    athleteModel: createDefaultAthleteModel(profile.id, 'intermediate'),
    aiMemory: { decisions: [], patterns: [], lastAnalysis: now },
    progressPhotos: [],
    gamification: {
      xp: 0, level: 1, rank: 'Beginner', rankProgress: 0,
      achievements: createDefaultAchievements(), missions: [], challenges: [],
      skillUnlocks: [], streakDays: 0, longestStreak: 0, weeklyXP: 0, monthlyXP: 0,
    },
    training: {
      programDay: 1, calendarDay: 1, weekNumber: 1, mesocycleNumber: 1, mesocycleWeek: 1,
      currentPhase: 'build', trainingPhase: 'foundation', isPost90: false,
      totalWorkoutsCompleted: 0, currentStreak: 0, longestStreak: 0,
    },
  };
}

// ─── SAFE LOAD ────────────────────────────────────────────────────────────────
function normalizeSessionStatus(data: AppData): AppData {
  const sessions = data.sessions.map((session: any) => ({
    ...session,
    completionStatus: session.completionStatus ?? (session.isRestDay ? 'rest' : 'completed'),
    exercises: (session.exercises ?? []).map((exercise: any) => ({
      ...exercise,
      executionStatus: exercise.executionStatus ?? (exercise.setTags ?? []).map((tag: string) => tag === 'failed' ? 'failed' : 'completed'),
      usedModification: Boolean(exercise.usedModification),
    })),
  }));
  return { ...data, sessions };
}

export function loadAppData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isValidAppData(parsed)) {
        if (!Array.isArray(parsed.progressPhotos)) parsed.progressPhotos = [];
        return normalizeSessionStatus(migrateIfNeeded(parsed));
      }
    }
  } catch { /* corrupted — fall through to migration attempt */ }

  // Attempt migration from legacy formats
  const migrated = attemptLegacyMigration();
  if (migrated) return normalizeSessionStatus(migrated);

  return createDefaultAppData();
}

function isValidAppData(data: any): data is AppData {
  return data && typeof data === 'object' && 'schemaVersion' in data && 'profile' in data && 'sessions' in data;
}

// ─── SAFE SAVE ────────────────────────────────────────────────────────────────
export function saveAppData(data: AppData): boolean {
  try {
    const json = JSON.stringify(data);
    localStorage.setItem(STORAGE_KEY, json);
    return true;
  } catch (e) {
    console.error('Failed to save app data', e);
    return false;
  }
}

// ─── MIGRATION: v1/v2 legacy → v3 canonical ──────────────────────────────────
function attemptLegacyMigration(): AppData | null {
  try {
    // Try v2 store format first (mike2_store_v1)
    const v2raw = localStorage.getItem(LEGACY_KEY_V2);
    if (v2raw) {
      const v2 = JSON.parse(v2raw);
      if (v2.sessions || v2.logs) return migrateFromV2(v2);
    }

    // Try v1 simple format (mike2v1)
    const v1raw = localStorage.getItem(LEGACY_KEY_V1);
    if (v1raw) {
      const v1 = JSON.parse(v1raw);
      if (v1.logs) return migrateFromV1(v1);
    }
  } catch { /* ignore, fall back to default */ }
  return null;
}

function inferMuscleGroup(exerciseName: string): MuscleGroup {
  const id = EXERCISE_NAME_TO_ID[exerciseName];
  const ex = id ? EXERCISE_REGISTRY[id] : undefined;
  return ex?.primaryMuscles[0] ?? 'full';
}

function migrateFromV1(v1: any): AppData {
  const base = createDefaultAppData();
  const startDate = v1.startDate || base.profile.startDate;
  const sessions: WorkoutSession[] = [];
  const prs: PRRecord[] = [];

  Object.entries(v1.logs || {}).forEach(([dayStr, log]: [string, any]) => {
    const day = Number(dayStr);
    const week = Math.ceil(day / 7);
    const repsLog = log.repsLog || {};
    const totalVolume = Object.values(repsLog).reduce((a: number, b: any) => a + Number(b || 0), 0);

    const exercises: ExerciseLog[] = Object.entries(repsLog).map(([key, reps]: [string, any]) => {
      const exName = `Exercise ${key.split('-')[0]}`;
      return {
        exerciseId: 'unknown', exerciseName: exName, sets: 1,
        repsPerSet: [Number(reps)], type: 'reps' as const,
        primaryMuscle: 'full' as MuscleGroup, difficulty: 5, setTags: [''],
        usedModification: false, executionStatus: ['completed'], targetReps: Number(reps), volumeProxy: Number(reps),
      };
    });

    sessions.push({
      id: `migrated_v1_${day}`, date: log.date || new Date().toISOString(),
      programDay: Math.min(day, 90), calendarDay: day, weekNumber: week,
      mesocycleNumber: day > 90 ? Math.floor((day - 90) / 28) + 2 : 1,
      mesocycleWeek: ((week - 1) % 4) + 1,
      phase: 'build', trainingPhase: day > 90 ? 'infinite' : 'foundation',
      focus: 'Migrated Workout', exercises, totalVolume,
      estimatedLoad: totalVolume,
      preCheckIn: { energy: 2, soreness: 1, timestamp: log.date || new Date().toISOString() },
      durationMinutes: 35, note: log.note || '', isRestDay: exercises.length === 0,
      generatedByAI: false, completionStatus: exercises.length === 0 ? 'rest' : 'completed', wasDeloadActive: false,
    });
  });

  Object.entries(v1.prs || {}).forEach(([name, value]: [string, any]) => {
    prs.push({ exerciseId: EXERCISE_NAME_TO_ID[name] || 'unknown', exerciseName: name, value: Number(value), date: new Date().toISOString(), calendarDay: 0, sessionId: '' });
  });

  return {
    ...base,
    profile: { ...base.profile, startDate, onboarded: true, settings: { ...base.profile.settings, ...(v1.settings || {}) } },
    sessions, prs,
  };
}

function migrateFromV2(v2: any): AppData {
  const base = createDefaultAppData();
  const startDate = v2.profile?.startDate || base.profile.startDate;
  const sessions: WorkoutSession[] = (v2.sessions || []).map((s: any) => ({
    id: s.id || `migrated_v2_${s.dayNumber}`,
    date: s.date, programDay: Math.min(s.dayNumber || 1, 90), calendarDay: s.dayNumber || 1,
    weekNumber: s.weekNumber || Math.ceil((s.dayNumber||1)/7),
    mesocycleNumber: s.mesocycleNumber || 1, mesocycleWeek: ((s.weekNumber||1) % 4) || 4,
    phase: s.phase || 'build', trainingPhase: (s.dayNumber || 1) > 90 ? 'infinite' : 'foundation',
    focus: s.focus || 'Workout',
    exercises: (s.exercises || []).map((e: any) => ({
      exerciseId: EXERCISE_NAME_TO_ID[e.exerciseName] || e.exerciseName?.toLowerCase().replace(/\s+/g,'_') || 'unknown',
      exerciseName: e.exerciseName, sets: e.sets || 1,
      repsPerSet: e.reps || [0], durationsPerSet: e.duration,
      type: e.type || 'reps', primaryMuscle: inferMuscleGroup(e.exerciseName),
      difficulty: e.difficulty || 5, setTags: e.setTags || [],
      usedModification: e.usedModification || false,
      executionStatus: e.executionStatus || (e.setTags || []).map((tag: string) => tag === 'failed' ? 'failed' : 'completed'),
      targetReps: e.reps?.[0] || 0, volumeProxy: (e.reps || []).reduce((a:number,b:number)=>a+b,0),
    })),
    totalVolume: s.totalVolume || 0, estimatedLoad: s.totalVolume || 0,
    preCheckIn: { energy: s.checkin?.energy ?? 2, soreness: s.checkin?.soreness ?? 1, timestamp: s.date },
    durationMinutes: s.durationMinutes || 35, note: s.note || '',
    isRestDay: s.isRestDay || false, completionStatus: s.completionStatus || (s.isRestDay ? 'rest' : 'completed'), generatedByAI: false, wasDeloadActive: false,
  }));

  const prs: PRRecord[] = (v2.prs || []).map((p: any) => ({
    exerciseId: p.exerciseName ? (EXERCISE_NAME_TO_ID[p.exerciseName] || 'unknown') : 'unknown',
    exerciseName: p.exerciseName, value: p.value, date: p.date,
    calendarDay: p.dayNumber || 0, sessionId: '',
  }));

  return {
    ...base,
    profile: { ...base.profile, startDate, onboarded: v2.profile?.onboarded ?? true, fitnessLevel: v2.profile?.fitnessLevel || 'intermediate', settings: { ...base.profile.settings, ...(v2.profile?.settings || {}) } },
    sessions, prs,
  };
}

// ─── SCHEMA MIGRATION (v3 → future) ──────────────────────────────────────────
function migrateIfNeeded(data: AppData): AppData {
  // v4 adds progressPhotos. Keep all existing data and initialize only the new collection.
  return { ...data, schemaVersion: SCHEMA_VERSION, progressPhotos: Array.isArray((data as any).progressPhotos) ? (data as any).progressPhotos : [] };
}

// ─── EXPORT / RESET ───────────────────────────────────────────────────────────
export function exportAppData(data: AppData): void {
  try {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mike2-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('Export failed', e);
  }
}

export function resetAppData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_KEY_V1);
    localStorage.removeItem(LEGACY_KEY_V2);
  } catch { /* ignore */ }
}
