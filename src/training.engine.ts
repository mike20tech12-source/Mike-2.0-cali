import {
  MesocyclePhase, TrainingPhase, GeneratedWorkout, PlannedExercise,
  AthleteModel, AdaptationState, AIState, TrainingState,
  PHASE_VOLUME_MULTIPLIERS, PHASE_INTENSITY_MULTIPLIERS,
} from './types';
import { EXERCISE_REGISTRY, EXERCISE_NAME_TO_ID } from './registry';

// ─── PLAN EXERCISE (raw plan format) ─────────────────────────────────────────
interface RawExercise {
  name: string;
  sets: number;
  reps: number | 'max';
  type: 'reps' | 'timed';
}

interface RawPlan {
  focus: string;
  warmupType: 'upper' | 'lower' | 'full';
  exercises: RawExercise[];
  isRest?: boolean;
}

// ─── 90-DAY BASE PLAN ─────────────────────────────────────────────────────────
// Maps day-of-week to workout plan for each phase
const BASE_PLANS: Record<string, Record<number, RawPlan>> = {
  week1: {
    2: { focus:'Pull + Core', warmupType:'upper', exercises:[{name:'Pull-ups',sets:5,reps:'max',type:'reps'},{name:'Chin-ups',sets:4,reps:10,type:'reps'},{name:'Backpack rows',sets:3,reps:12,type:'reps'},{name:'Dead hangs',sets:3,reps:45,type:'timed'},{name:'Hanging leg raises',sets:4,reps:10,type:'reps'}]},
    3: { focus:'Legs + Conditioning', warmupType:'lower', exercises:[{name:'Squats',sets:4,reps:20,type:'reps'},{name:'Jump squats',sets:4,reps:12,type:'reps'},{name:'Bulgarian split squats',sets:3,reps:10,type:'reps'},{name:'Wall sit',sets:3,reps:60,type:'timed'},{name:'Mountain climbers',sets:3,reps:40,type:'timed'}]},
    4: { focus:'Push Power', warmupType:'upper', exercises:[{name:'Decline push-ups',sets:4,reps:12,type:'reps'},{name:'Pike push-ups',sets:4,reps:10,type:'reps'},{name:'Chair dips',sets:4,reps:12,type:'reps'},{name:'Diamond push-ups',sets:3,reps:10,type:'reps'},{name:'Plank',sets:3,reps:45,type:'timed'}]},
    5: { focus:'Pull Power', warmupType:'upper', exercises:[{name:'Pull-ups',sets:5,reps:'max',type:'reps'},{name:'Negative pull-ups',sets:3,reps:5,type:'reps'},{name:'Chin-ups',sets:4,reps:'max',type:'reps'},{name:'Dead hangs',sets:3,reps:45,type:'timed'},{name:'Hollow hold',sets:3,reps:30,type:'timed'}]},
    6: { focus:'Athletic Circuit', warmupType:'full', exercises:[{name:'Push-ups',sets:5,reps:10,type:'reps'},{name:'Pull-ups',sets:5,reps:10,type:'reps'},{name:'Squats',sets:5,reps:15,type:'reps'},{name:'Burpees',sets:5,reps:10,type:'reps'},{name:'Plank',sets:5,reps:30,type:'timed'}]},
    0: { focus:'Recovery', warmupType:'full', exercises:[], isRest:true },
    1: { focus:'Push + Abs', warmupType:'upper', exercises:[{name:'Push-ups',sets:4,reps:20,type:'reps'},{name:'Decline push-ups',sets:3,reps:12,type:'reps'},{name:'Pike push-ups',sets:4,reps:10,type:'reps'},{name:'Chair dips',sets:4,reps:12,type:'reps'},{name:'Hanging knee raises',sets:3,reps:12,type:'reps'}]},
  },
  weeks3_4: {
    0: { focus:'Recovery', warmupType:'full', exercises:[], isRest:true },
    2: { focus:'Pull Explosive', warmupType:'upper', exercises:[{name:'Explosive pull-ups',sets:4,reps:'max',type:'reps'},{name:'Chin-ups',sets:4,reps:12,type:'reps'},{name:'Hanging leg raises',sets:4,reps:12,type:'reps'},{name:'Hollow hold',sets:3,reps:40,type:'timed'}]},
    3: { focus:'Legs Power', warmupType:'lower', exercises:[{name:'Jump squats',sets:4,reps:15,type:'reps'},{name:'Bulgarian split squats',sets:4,reps:12,type:'reps'},{name:'Wall sit',sets:3,reps:75,type:'timed'},{name:'Hanging leg raises',sets:3,reps:12,type:'reps'}]},
    4: { focus:'Push Harder', warmupType:'upper', exercises:[{name:'Archer push-ups',sets:4,reps:8,type:'reps'},{name:'Pike push-ups',sets:4,reps:12,type:'reps'},{name:'Diamond push-ups',sets:4,reps:12,type:'reps'},{name:'Plank',sets:3,reps:60,type:'timed'}]},
    5: { focus:'Pull Strength', warmupType:'upper', exercises:[{name:'Pull-ups',sets:5,reps:'max',type:'reps'},{name:'Negative pull-ups',sets:4,reps:5,type:'reps'},{name:'Backpack rows',sets:4,reps:14,type:'reps'},{name:'Dead hangs',sets:3,reps:60,type:'timed'}]},
    6: { focus:'Full Body Circuit', warmupType:'full', exercises:[{name:'Burpees',sets:5,reps:10,type:'reps'},{name:'Pull-ups',sets:5,reps:'max',type:'reps'},{name:'Push-ups',sets:5,reps:15,type:'reps'},{name:'Mountain climbers',sets:4,reps:40,type:'timed'}]},
    1: { focus:'Push + Core', warmupType:'upper', exercises:[{name:'Archer push-ups',sets:4,reps:10,type:'reps'},{name:'Chair dips',sets:4,reps:15,type:'reps'},{name:'Plank',sets:4,reps:60,type:'timed'},{name:'Hollow hold',sets:3,reps:40,type:'timed'}]},
  },
  weeks5_8: {
    0: { focus:'Recovery', warmupType:'full', exercises:[], isRest:true },
    1: { focus:'Push + Abs', warmupType:'upper', exercises:[{name:'Archer push-ups',sets:4,reps:10,type:'reps'},{name:'Dips',sets:4,reps:12,type:'reps'},{name:'Pike push-ups',sets:4,reps:12,type:'reps'},{name:'Hanging leg raises',sets:4,reps:15,type:'reps'}]},
    2: { focus:'Pull + Core', warmupType:'upper', exercises:[{name:'Explosive pull-ups',sets:5,reps:'max',type:'reps'},{name:'Chin-ups',sets:4,reps:12,type:'reps'},{name:'Backpack rows',sets:3,reps:15,type:'reps'},{name:'Hollow hold',sets:4,reps:45,type:'timed'}]},
    3: { focus:'Legs', warmupType:'lower', exercises:[{name:'Jump lunges',sets:4,reps:12,type:'reps'},{name:'Bulgarian split squats',sets:4,reps:12,type:'reps'},{name:'Wall sit',sets:3,reps:90,type:'timed'}]},
    4: { focus:'Explosive Push', warmupType:'upper', exercises:[{name:'Clap push-ups',sets:4,reps:8,type:'reps'},{name:'Decline push-ups',sets:4,reps:15,type:'reps'},{name:'Diamond push-ups',sets:4,reps:12,type:'reps'}]},
    5: { focus:'Explosive Pull', warmupType:'upper', exercises:[{name:'Chest-to-bar pull-ups',sets:5,reps:'max',type:'reps'},{name:'Negative pull-ups',sets:4,reps:5,type:'reps'},{name:'Hanging leg raises',sets:4,reps:15,type:'reps'}]},
    6: { focus:'HIIT Full Body', warmupType:'full', exercises:[{name:'Burpees',sets:5,reps:12,type:'reps'},{name:'Pull-ups',sets:5,reps:'max',type:'reps'},{name:'Push-ups',sets:5,reps:20,type:'reps'},{name:'Mountain climbers',sets:5,reps:40,type:'timed'}]},
  },
  weeks9_12: {
    0: { focus:'Recovery', warmupType:'full', exercises:[], isRest:true },
    1: { focus:'Advanced Push', warmupType:'upper', exercises:[{name:'Pseudo planche push-ups',sets:4,reps:8,type:'reps'},{name:'Dips',sets:4,reps:15,type:'reps'},{name:'Pike push-ups',sets:4,reps:15,type:'reps'}]},
    2: { focus:'Advanced Pull', warmupType:'upper', exercises:[{name:'Typewriter pull-ups',sets:4,reps:'max',type:'reps'},{name:'Explosive pull-ups',sets:4,reps:'max',type:'reps'},{name:'Hanging leg raises',sets:4,reps:20,type:'reps'}]},
    3: { focus:'Legs + Core', warmupType:'lower', exercises:[{name:'Pistol squat progression',sets:4,reps:5,type:'reps'},{name:'Hanging leg raises',sets:4,reps:20,type:'reps'},{name:'Hollow hold',sets:4,reps:60,type:'timed'}]},
    4: { focus:'Skill Work', warmupType:'upper', exercises:[{name:'L-sit progression',sets:5,reps:10,type:'timed'},{name:'Handstand wall holds',sets:4,reps:20,type:'timed'}]},
    5: { focus:'Power + Conditioning', warmupType:'full', exercises:[{name:'Burpees',sets:5,reps:15,type:'reps'},{name:'Jump squats',sets:5,reps:15,type:'reps'},{name:'Pull-ups',sets:5,reps:'max',type:'reps'}]},
    6: { focus:'Athletic Circuit', warmupType:'full', exercises:[{name:'Chest-to-bar pull-ups',sets:5,reps:'max',type:'reps'},{name:'Clap push-ups',sets:5,reps:10,type:'reps'},{name:'Pistol squat progression',sets:5,reps:5,type:'reps'},{name:'Burpees',sets:5,reps:15,type:'reps'}]},
  },
};

// ─── GET RAW PLAN FOR PROGRAM DAY ─────────────────────────────────────────────
export function getRawPlanForDay(programDay: number, startDate: string): RawPlan & { phase: MesocyclePhase } {
  const start = new Date(startDate);
  const d = new Date(start);
  d.setDate(start.getDate() + programDay - 1);
  const dow = d.getDay();
  const week = Math.ceil(programDay / 7);
  const rest: RawPlan & { phase: MesocyclePhase } = { focus:'Recovery 🧘', warmupType:'full', exercises:[], isRest:true, phase:'deload' };

  // Deload weeks
  const isDeload = [4, 8, 12].includes(week);
  const phase: MesocyclePhase = isDeload ? 'deload' : week % 4 === 3 ? 'peak' : week % 4 === 2 ? 'overload' : 'build';

  let plan: RawPlan | undefined;
  if (programDay <= 14) {
    plan = BASE_PLANS.week1[dow];
    if (programDay > 7 && plan && !plan.isRest) {
      // Week 2: progressive overload on week 1
      plan = {
        ...plan,
        focus: plan.focus + ' ↑',
        exercises: plan.exercises.map(e => ({
          ...e,
          reps: e.reps === 'max' ? 'max' : typeof e.reps === 'number' ? e.reps + 2 : e.reps,
        })),
      };
    }
  } else if (programDay <= 28) {
    plan = BASE_PLANS.weeks3_4[dow];
  } else if (programDay <= 56) {
    plan = BASE_PLANS.weeks5_8[dow];
  } else {
    plan = BASE_PLANS.weeks9_12[dow];
  }

  if (!plan || plan.isRest || dow === 0) return rest;
  return { ...plan, phase };
}

// Walks the progression chain from a base exercise using the durable
// Athlete Model, not a transient last-session lookup. This is what makes
// progression sticky: once 'pullup' is flagged readyForProgression it stays
// that way in the athlete model (nothing re-tests it once training moves
// past it), so every future occurrence of the "Pull-ups" template slot
// resolves forward to chest_to_bar (and beyond) instead of reverting to the
// base move the moment a session cycle passes.
function resolveProgressionLevel(
  baseExId: string,
  athleteModel: AthleteModel | null,
): { id: string; progressed: boolean } {
  if (!athleteModel) return { id: baseExId, progressed: false };
  let curId = baseExId;
  let cur = EXERCISE_REGISTRY[curId];
  let progressed = false;
  let guard = 0;
  while (cur?.progressionId && athleteModel.exerciseMastery[curId]?.readyForProgression && guard < 10) {
    curId = cur.progressionId;
    cur = EXERCISE_REGISTRY[curId];
    progressed = true;
    guard++;
  }
  return { id: curId, progressed };
}

// ─── CONVERT RAW TO PLANNED EXERCISES ────────────────────────────────────────
export function rawToPlanned(
  raw: RawExercise,
  phase: MesocyclePhase,
  adaptation: AdaptationState | null,
  athleteModel: AthleteModel | null,
  aiAdjustments: Map<string, { decision: string; suggestedValue: string }>,
): PlannedExercise {
  const baseExId = EXERCISE_NAME_TO_ID[raw.name] || raw.name.toLowerCase().replace(/\s+/g, '_');
  const { id: exId, progressed: wasProgressed } = resolveProgressionLevel(baseExId, athleteModel);
  const ex = EXERCISE_REGISTRY[exId];
  const exerciseName = ex?.name ?? raw.name;

  // Phase multipliers
  const volMult = PHASE_VOLUME_MULTIPLIERS[phase] ?? 1.0;
  const intMult = PHASE_INTENSITY_MULTIPLIERS[phase] ?? 1.0;

  // Adaptation multiplier, looked up by the FINAL (possibly progressed) exercise
  const globalMult = adaptation?.globalDifficultyMultiplier ?? 1.0;
  const exMult = adaptation?.exerciseMultipliers?.[exId] ?? 1.0;
  const combinedMult = globalMult * exMult;

  // Rep/set tuning adjustments are transient and session-scoped by design —
  // re-evaluated fresh each cycle from whichever exercise the athlete is
  // CURRENTLY training (exId, after any progression above), so they always
  // reflect the tier the athlete is actually at, not a stale earlier one.
  const aiAdj = aiAdjustments.get(exId);
  const overridden = !!aiAdjustments.get(exId + '_overridden');

  let sets = Math.max(2, Math.round(raw.sets * volMult * combinedMult));
  let targetReps: number | 'max' = raw.reps;
  // Isometric/skill holds are modeled with repRange [1,1] + a holdRange in
  // the registry — use that to decide type when the exercise just changed.
  let type = raw.type;
  const m = athleteModel?.exerciseMastery[exId];
  const hasHistory = !!m && m.sessionsCompleted >= 2;

  if (wasProgressed && ex) {
    const isHold = ex.holdRange !== undefined && ex.repRange[0] === 1 && ex.repRange[1] === 1;
    type = isHold ? 'timed' : 'reps';
    if (raw.reps === 'max') {
      // A newly-unlocked max-rep exercise has no history of its own yet on
      // day one — but on every subsequent occurrence it does, and must use
      // it, or progression permanently stalls the moment a harder variation
      // is unlocked (exactly the same bug as the static-template case below,
      // just one level removed).
      targetReps = 'max';
    } else if (isHold) {
      const registryMid = Math.round((ex.holdRange![0] + ex.holdRange![1]) / 2);
      const base = (hasHistory && m!.averageDuration > 0) ? Math.max(m!.averageDuration, registryMid) : registryMid;
      targetReps = Math.round(base * intMult);
    } else {
      const registryMid = Math.round((ex.repRange[0] + ex.repRange[1]) / 2);
      const base = (hasHistory && m!.averageReps > 0) ? Math.max(m!.averageReps, registryMid) : registryMid;
      targetReps = Math.round(base * intMult * combinedMult);
    }
  } else if (raw.reps !== 'max' && typeof raw.reps === 'number') {
    // The static template number is only the STARTING baseline (what a
    // brand-new athlete should attempt). Once the athlete has demonstrated
    // real performance on this exercise, that becomes the baseline instead —
    // otherwise prescribed reps/holds would silently reset to the week-1
    // template value every time this slot recurs, discarding all earned
    // progression. Timed holds anchor to averageDuration; rep exercises
    // anchor to averageReps — using the wrong one silently zeroes out any
    // history for every isometric exercise in the program.
    const historicalAvg = raw.type === 'timed' ? m?.averageDuration : m?.averageReps;
    const persistentBase = (hasHistory && historicalAvg && historicalAvg > 0)
      ? Math.max(historicalAvg, raw.reps)
      : raw.reps;
    targetReps = Math.max(1, Math.round(persistentBase * (raw.type === 'timed' ? intMult : intMult * combinedMult)));
  }

  if (aiAdj && !overridden) {
    if (aiAdj.decision === 'increase_reps' && targetReps !== 'max') {
      targetReps = Math.min(Number(targetReps) + 2, 50);
    } else if (aiAdj.decision === 'reduce_reps' && targetReps !== 'max') {
      targetReps = Math.max(1, Number(targetReps) - 2);
    } else if (aiAdj.decision === 'increase_sets') {
      sets = Math.min(sets + 1, 8);
    } else if (aiAdj.decision === 'reduce_sets') {
      sets = Math.max(2, sets - 1);
    }
  }

  const restSeconds = ex?.restRange
    ? Math.round(ex.restRange[0] + (ex.restRange[1] - ex.restRange[0]) * 0.5)
    : 60;

  return {
    exerciseId: exId,
    exerciseName,
    sets,
    targetReps,
    targetDuration: type === 'timed' && targetReps !== 'max' ? Number(targetReps) : undefined,
    type,
    restSeconds,
    progressionDecision: wasProgressed ? 'unlock_variation' : 'maintain',
    adjustmentReason: wasProgressed
      ? `Progressed from ${EXERCISE_REGISTRY[baseExId]?.name ?? raw.name} — mastery achieved`
      : aiAdj?.suggestedValue,
  };
}

// ─── INFINITE MESOCYCLE TEMPLATES ────────────────────────────────────────────
// Templates for post-90 infinite training, keyed by day-of-week
const INFINITE_TEMPLATES: Record<number, Omit<RawPlan, 'isRest'>> = {
  0: { focus:'Recovery', warmupType:'full', exercises:[] },
  1: { focus:'Advanced Push', warmupType:'upper', exercises:[{name:'Pseudo planche push-ups',sets:4,reps:10,type:'reps'},{name:'Dips',sets:4,reps:15,type:'reps'},{name:'Pike push-ups',sets:4,reps:15,type:'reps'},{name:'Hanging leg raises',sets:4,reps:20,type:'reps'}]},
  2: { focus:'Advanced Pull', warmupType:'upper', exercises:[{name:'Typewriter pull-ups',sets:4,reps:'max',type:'reps'},{name:'Explosive pull-ups',sets:4,reps:'max',type:'reps'},{name:'Hollow hold',sets:4,reps:45,type:'timed'},{name:'L-sit progression',sets:4,reps:10,type:'timed'}]},
  3: { focus:'Legs + Core', warmupType:'lower', exercises:[{name:'Pistol squat progression',sets:4,reps:6,type:'reps'},{name:'Jump lunges',sets:4,reps:15,type:'reps'},{name:'Wall sit',sets:3,reps:90,type:'timed'}]},
  4: { focus:'Skill Work', warmupType:'upper', exercises:[{name:'Handstand wall holds',sets:5,reps:30,type:'timed'},{name:'L-sit progression',sets:5,reps:15,type:'timed'},{name:'Plank',sets:4,reps:90,type:'timed'}]},
  5: { focus:'Power + Conditioning', warmupType:'full', exercises:[{name:'Chest-to-bar pull-ups',sets:5,reps:'max',type:'reps'},{name:'Clap push-ups',sets:5,reps:10,type:'reps'},{name:'Burpees',sets:5,reps:15,type:'reps'},{name:'Jump squats',sets:4,reps:20,type:'reps'}]},
  6: { focus:'Athletic Circuit', warmupType:'full', exercises:[{name:'Pull-ups',sets:5,reps:'max',type:'reps'},{name:'Push-ups',sets:5,reps:25,type:'reps'},{name:'Burpees',sets:5,reps:15,type:'reps'},{name:'Hollow hold',sets:5,reps:45,type:'timed'}]},
};

// ─── GET MESOCYCLE PHASE ──────────────────────────────────────────────────────
export function getMesocyclePhase(mesocycleWeek: number): MesocyclePhase {
  switch (mesocycleWeek) {
    case 1: return 'build';
    case 2: return 'overload';
    case 3: return 'peak';
    case 4: return 'deload';
    default: return 'build';
  }
}

// ─── CALCULATE TRAINING STATE ─────────────────────────────────────────────────
export function calcTrainingState(
  startDate: string,
  completedDays: number[],
  totalWorkouts: number,
): Omit<TrainingState, 'nextWorkout'> {
  const start = new Date(startDate); start.setHours(0,0,0,0);
  const now = new Date(); now.setHours(0,0,0,0);
  const calendarDay = Math.max(1, Math.floor((now.getTime() - start.getTime()) / 86400000) + 1);
  // Program day follows the real calendar indefinitely; Day 90 is the transition, not a hard cap.
  const programDay = calendarDay;
  const isPost90 = calendarDay > 90;

  let mesocycleNumber: number;
  let mesocycleWeek: number;
  let weekNumber: number;

  if (!isPost90) {
    weekNumber = Math.ceil(programDay / 7);
    mesocycleNumber = 1;
    mesocycleWeek = ((weekNumber - 1) % 4) + 1;
  } else {
    const daysBeyond90 = calendarDay - 90;
    const cycleDay = (daysBeyond90 - 1) % 28;
    mesocycleNumber = Math.floor((daysBeyond90 - 1) / 28) + 2;
    mesocycleWeek = Math.floor(cycleDay / 7) + 1;
    weekNumber = Math.ceil(calendarDay / 7);
  }

  const currentPhase = getMesocyclePhase(mesocycleWeek);
  const trainingPhase: TrainingPhase = isPost90 ? 'infinite' : 'foundation';

  // Calculate streak
  const sortedDays = [...completedDays].sort((a,b) => b-a);
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  let prevDay = -1;
  for (const day of sortedDays) {
    if (prevDay === -1 || prevDay - day <= 2) { tempStreak++; }
    else { longestStreak = Math.max(longestStreak, tempStreak); tempStreak = 1; }
    prevDay = day;
  }
  longestStreak = Math.max(longestStreak, tempStreak);
  // Current streak from today backwards
  for (let i = 0; i < sortedDays.length; i++) {
    if (i === 0 && calendarDay - sortedDays[0] <= 1) currentStreak = 1;
    else if (i > 0 && sortedDays[i-1] - sortedDays[i] <= 2) currentStreak++;
    else break;
  }

  return {
    programDay, calendarDay, weekNumber,
    mesocycleNumber, mesocycleWeek, currentPhase, trainingPhase, isPost90,
    totalWorkoutsCompleted: totalWorkouts,
    currentStreak, longestStreak,
  };
}

// ─── MAIN WORKOUT GENERATOR ───────────────────────────────────────────────────
export function generateWorkout(
  training: Omit<TrainingState, 'nextWorkout'>,
  startDate: string,
  athleteModel: AthleteModel | null,
  adaptation: AdaptationState | null,
  ai: AIState | null,
): GeneratedWorkout {
  const id = `workout_${Date.now()}`;
  const { calendarDay, currentPhase, isPost90, mesocycleNumber } = training;

  // Build AI adjustments map
  const aiAdjMap = new Map<string, { decision: string; suggestedValue: string }>();
  if (ai?.nextWorkoutAdjustments) {
    for (const adj of ai.nextWorkoutAdjustments) {
      if (!adj.overridden && !adj.applied) {
        aiAdjMap.set(adj.exerciseId, { decision: adj.adjustmentType, suggestedValue: adj.suggestedValue });
      }
    }
  }

  let raw: RawPlan;
  let phase = currentPhase;

  // Override with deload if adaptation says so
  if (adaptation?.deloadActive) phase = 'deload';

  if (!isPost90) {
    const result = getRawPlanForDay(training.programDay, startDate);
    raw = result;
    phase = result.phase ?? currentPhase;
  } else {
    // Infinite mode: use template + personalization
    const now = new Date(startDate);
    now.setDate(now.getDate() + calendarDay - 1);
    const dow = now.getDay();
    const template = INFINITE_TEMPLATES[dow];
    raw = { ...template, isRest: dow === 0 };

    // Personalize based on athlete model weak points
    if (athleteModel && dow !== 0) {
      const weakest = athleteModel.weakPoints[0];
      if (weakest === 'pull' && (dow === 1 || dow === 4)) {
        raw = { ...raw, exercises: [...raw.exercises, { name:'Pull-ups', sets:3, reps:'max', type:'reps' }] };
      } else if (weakest === 'core' && dow === 4) {
        raw = { ...raw, exercises: [...raw.exercises, { name:'Hollow hold', sets:3, reps:30, type:'timed' }] };
      }
    }
  }

  if (raw.isRest || raw.exercises.length === 0) {
    return {
      id, generatedAt: new Date().toISOString(), forCalendarDay: calendarDay,
      focus: 'Recovery 🧘', exercises: [], estimatedDuration: 20,
      phase, warmupType: 'full', aiDecisionIds: [], reasoning: 'Rest day',
    };
  }

  // Convert to planned exercises with AI + adaptation adjustments
  const planned: PlannedExercise[] = raw.exercises.map(e =>
    rawToPlanned(e, phase, adaptation, athleteModel, aiAdjMap)
  );

  // Estimate duration
  const workTime = planned.reduce((a, e) => {
    const reps = e.targetReps === 'max' ? 30 : (e.targetDuration ?? Number(e.targetReps));
    return a + e.sets * (e.type === 'timed' ? reps : reps * 2.5);
  }, 0);
  const restTime = planned.reduce((a, e) => a + e.sets * e.restSeconds, 0);
  const estimatedDuration = Math.round((workTime + restTime + 360) / 60);

  const aiDecisionIds = ai?.currentDecisions?.map(d => d.id) ?? [];
  const reasoning = adaptation?.deloadActive
    ? `Deload week — ${adaptation.deloadReason}`
    : isPost90
      ? `Mesocycle ${mesocycleNumber} — ${phase} phase — personalized for your athlete profile`
      : `Day ${training.programDay} — ${phase} phase`;

  return {
    id, generatedAt: new Date().toISOString(), forCalendarDay: calendarDay,
    focus: raw.focus, exercises: planned, estimatedDuration,
    phase, warmupType: raw.warmupType ?? 'full',
    aiDecisionIds, reasoning,
  };
}
