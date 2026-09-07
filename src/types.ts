// ============================================================
// MIKE 2.0 — TRANSFORMATION OPERATING SYSTEM
// types.ts — Single canonical type system
// ============================================================

// ─── SCHEMA VERSION ───────────────────────────────────────────────────────────
export const SCHEMA_VERSION = 4;

// ─── ENUMS ────────────────────────────────────────────────────────────────────
export type FitnessLevel   = 'beginner' | 'intermediate' | 'advanced';
export type MuscleGroup    = 'push' | 'pull' | 'legs' | 'core' | 'full';
export type MovementPattern = 'horizontal_push' | 'vertical_push' | 'horizontal_pull' | 'vertical_pull' | 'squat' | 'hinge' | 'carry' | 'isometric' | 'explosive' | 'skill';
export type ExerciseCategory = 'strength' | 'skill' | 'conditioning' | 'mobility' | 'isometric';
export type SetTag         = 'easy' | 'good' | 'hard' | 'failed' | '';
export type MesocyclePhase = 'build' | 'overload' | 'peak' | 'deload';
export type TrainingPhase  = 'foundation' | 'infinite';
export type ProgressionDecision = 'maintain' | 'increase_reps' | 'increase_sets' | 'increase_duration' | 'increase_difficulty' | 'unlock_variation' | 'reduce_reps' | 'reduce_sets' | 'regress_variation' | 'substitute' | 'skill_practice' | 'deload';
export type IdentityRank   = 'Beginner' | 'Improving' | 'Athlete' | 'Advanced' | 'Elite' | 'Apex';
export type AdaptationTrigger = 'planned_deload' | 'fatigue_high' | 'plateau_detected' | 'performance_failing' | 'progression_strong' | 'recovery_needed' | 'skill_ready';
export type AIDecisionType = 'progression' | 'deload' | 'plateau_break' | 'fatigue_management' | 'skill_unlock' | 'variation_change' | 'volume_adjustment';
export type MissionType    = 'daily' | 'weekly' | 'challenge' | 'skill';
export type MissionStatus  = 'active' | 'completed' | 'failed' | 'expired';

// ─── USER PROFILE ─────────────────────────────────────────────────────────────
export interface UserProfile {
  id: string;
  startDate: string;           // ISO date string
  fitnessLevel: FitnessLevel;
  onboarded: boolean;
  settings: AppSettings;
  createdAt: string;
}

export interface AppSettings {
  restTime: number;
  haptics: boolean;
  audio: boolean;
  notifTime: string;
  fontSize: 'normal' | 'large';
  streakAlert: boolean;
  chatEnabled: boolean;
  floatingChatVisible: boolean;
}

// ─── EXERCISE REGISTRY ────────────────────────────────────────────────────────
export interface ExerciseDefinition {
  id: string;
  name: string;
  category: ExerciseCategory;
  movement: MovementPattern;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  equipment: string[];
  difficulty: number;           // 1–10
  progressionFamily: string;    // e.g. 'vertical_pull', 'push', 'squat'
  progressionLevel: number;     // position in family tree 1=easiest
  regressionId?: string;        // id of easier exercise
  progressionId?: string;       // id of harder exercise
  repRange: [number, number];   // [min, max] typical reps
  holdRange?: [number, number]; // [min, max] seconds for timed
  restRange: [number, number];  // [min, max] rest seconds
  skillRequirements: string[];
  coachingCues: string[];
  breathingCue: string;
  modifications: string[];
  commonMistakes: string[];
  tips: string[];
}

// ─── PROGRESSION TREE ─────────────────────────────────────────────────────────
export interface ProgressionNode {
  exerciseId: string;
  children: string[];           // exercise IDs of harder progressions
  parent?: string;              // exercise ID of easier regression
  unlockCriteria: UnlockCriteria;
  masteryThreshold: MasteryThreshold;
}

export interface UnlockCriteria {
  minReps?: number;
  minSets?: number;
  minDuration?: number;
  minSessions?: number;         // sessions at current level
  minConsecutiveSessions?: number;
  requiredRank?: IdentityRank;
}

export interface MasteryThreshold {
  reps?: number;
  sets?: number;
  duration?: number;
  consecutiveSessions: number;
  difficultyTag: SetTag;        // must achieve this tag consistently
}

// ─── WORKOUT SESSION (canonical) ─────────────────────────────────────────────
export interface WorkoutSession {
  id: string;
  date: string;                 // ISO
  programDay: number;           // day within 90-day program (1-90)
  calendarDay: number;          // total days since start (can exceed 90)
  weekNumber: number;
  mesocycleNumber: number;
  mesocycleWeek: number;        // week within current mesocycle (1-4)
  phase: MesocyclePhase;
  trainingPhase: TrainingPhase;
  focus: string;
  exercises: ExerciseLog[];
  preCheckIn: PreWorkoutCheckIn;
  totalVolume: number;
  estimatedLoad: number;        // weighted volume proxy
  durationMinutes: number;
  note: string;
  isRestDay: boolean;
  generatedByAI: boolean;       // true if workout was AI-generated
  aiDecisionId?: string;        // reference to the AI decision that generated this
  wasDeloadActive?: boolean;    // true if adaptation.deloadActive was in effect when
                                 // this workout was generated — captures BOTH scheduled
                                 // (session.phase==='deload') AND adaptive overrides
                                 // (plateau/fatigue-triggered), which session.phase alone
                                 // does not reflect since it only records the planned
                                 // mesocycle week, not the actual applied multiplier.
}

export interface ExerciseLog {
  exerciseId: string;
  exerciseName: string;
  sets: number;
  repsPerSet: number[];         // actual reps per set
  durationsPerSet?: number[];   // seconds per set (timed)
  type: 'reps' | 'timed';
  primaryMuscle: MuscleGroup;
  difficulty: number;           // 1–10 avg from set tags
  setTags: SetTag[];
  usedModification: boolean;
  targetReps: number | 'max';   // what was planned
  targetDuration?: number;
  volumeProxy: number;          // reps × sets (or duration × sets)
  progressionDecision?: ProgressionDecision; // decision made after this log
}

export interface PreWorkoutCheckIn {
  energy: number;               // 0–3
  soreness: number;             // 0–3
  timestamp: string;
}

// ─── ATHLETE MODEL ────────────────────────────────────────────────────────────
export interface AthleteModel {
  userId: string;
  trainingAgeDays: number;
  currentLevel: FitnessLevel;
  overallScore: number;

  // Strength development per family
  exerciseMastery: Record<string, ExerciseMastery>;

  // Muscle balance
  muscleBalance: MuscleBalance;

  // Progression velocity
  progressionVelocity: number;  // avg reps gained per week
  recoveryRate: number;         // 0–1 (how fast they recover based on history)
  fatigueResponse: number;      // 0–1 (how sensitive to fatigue)

  // Plateau and adaptation history
  plateauHistory: PlateauEvent[];
  adaptationHistory: AdaptationEvent[];
  successfulAdaptations: string[];
  failedAdaptations: string[];

  // Weak / strong points
  weakPoints: MuscleGroup[];
  strongPoints: MuscleGroup[];

  // Skill unlocks
  unlockedSkills: string[];     // exercise IDs unlocked

  // Recovery patterns
  avgEnergyBeforeWorkout: number;
  avgSorenessBeforeWorkout: number;
  optimalRestDays: number;

  lastUpdated: string;
}

export interface ExerciseMastery {
  exerciseId: string;
  exerciseName: string;
  sessionsCompleted: number;
  bestReps: number;
  bestDuration: number;
  averageReps: number;
  averageDuration: number;
  averageDifficulty: number;
  progressionLevel: number;
  isPlateaued: boolean;
  lastProgressed: string;
  readyForProgression: boolean;
  mastered: boolean;
}

export interface MuscleBalance {
  push: number;                 // weekly volume score
  pull: number;
  legs: number;
  core: number;
  pushPullRatio: number;        // ideal ~1.0
  overallBalance: number;       // 0–1
}

export interface PlateauEvent {
  exerciseId: string;
  exerciseName: string;
  detectedAt: string;
  sessionCount: number;
  resolvedAt?: string;
  resolution?: string;
}

export interface AdaptationEvent {
  id: string;
  date: string;
  trigger: AdaptationTrigger;
  decision: ProgressionDecision;
  exerciseId?: string;
  reason: string;
  previousValue: string;
  newValue: string;
  outcome?: 'success' | 'failure' | 'neutral';
  outcomeRecordedAt?: string;
}

// ─── AI MEMORY ────────────────────────────────────────────────────────────────
export interface AIMemory {
  decisions: AIDecisionRecord[];
  patterns: AIPattern[];
  lastAnalysis: string;
}

export interface AIDecisionRecord {
  id: string;
  date: string;
  type: AIDecisionType;
  reasoning: string;
  exerciseId?: string;
  decision: ProgressionDecision;
  previousState: string;
  newState: string;
  resultingWorkoutId?: string;
  outcome?: 'success' | 'failure' | 'neutral';
  outcomeSessionId?: string;
}

export interface AIPattern {
  pattern: string;
  frequency: number;
  lastSeen: string;
  actionTaken: string;
  successRate: number;
}

// ─── TRANSFORMATION STATE ─────────────────────────────────────────────────────
export interface TransformationState {
  overallScore: number;         // 0–100
  strengthIndex: number;        // 0–100 (35%)
  consistencyIndex: number;     // 0–100 (25%)
  physiqueScore: number;        // 0–100 (20%)
  progressionIndex: number;     // 0–100 (20%)
  identityRank: IdentityRank;
  xp: number;
  level: number;
  rankProgress: number;         // 0–100% to next rank
  scoreHistory: { date: string; score: number }[];
  lastUpdated: string;
}

// ─── ADAPTATION STATE ─────────────────────────────────────────────────────────
export interface AdaptationState {
  fatigueLevel: number;         // 0–10
  recoveryState: 'fresh' | 'normal' | 'fatigued' | 'overtrained';
  trainingReadiness: number;    // 0–100
  deloadActive: boolean;
  deloadReason: string;
  deloadType: 'planned' | 'adaptive' | 'none';
  globalDifficultyMultiplier: number; // 0.7–1.25
  exerciseMultipliers: Record<string, number>; // per-exercise
  consecutiveStrongSessions: number;
  consecutiveWeakSessions: number;
  plateaus: PlateauEvent[];
  pendingDecisions: AdaptationEvent[];
  log: AdaptationEvent[];
}

// ─── AI STATE ─────────────────────────────────────────────────────────────────
export interface AIState {
  insights: AIInsight[];
  nextWorkoutAdjustments: WorkoutAdjustment[];
  weakMuscleGroups: WeakPoint[];
  currentDecisions: AIDecisionRecord[];
  lastAnalysis: string;
}

export interface AIInsight {
  id: string;
  date: string;
  type: 'progression' | 'plateau' | 'recovery' | 'milestone' | 'weakness' | 'form' | 'general';
  priority: 'low' | 'medium' | 'high';
  title: string;
  message: string;
  reasoning: string;
  dismissed: boolean;
  actionable: boolean;
  linkedDecisionId?: string;
}

export interface WorkoutAdjustment {
  exerciseId: string;
  exerciseName: string;
  adjustmentType: ProgressionDecision;
  currentValue: string;
  suggestedValue: string;
  reason: string;
  applied: boolean;
  overridden: boolean;
  priority: number;
}

export interface WeakPoint {
  group: MuscleGroup;
  volumeDeficit: number;
  suggestion: string;
}

// ─── ANALYTICS STATE ──────────────────────────────────────────────────────────
export interface AnalyticsState {
  muscleVolume: WeeklyMuscleVolume[];
  progressionCurves: ExerciseProgressionCurve[];
  weeklyTrends: WeeklyTrend[];
  fatigueHistory: FatigueDataPoint[];
  sorenessVsPerformance: CorrelationPoint[];
  energyVsPerformance: CorrelationPoint[];
  bestWeek: number;
  bestWeekVolume: number;
  phaseHistory: PhaseRecord[];
  mesocycleHistory: MesocycleRecord[];
  prHistory: PRRecord[];
}

export interface WeeklyMuscleVolume {
  weekNumber: number;
  push: number;
  pull: number;
  legs: number;
  core: number;
  total: number;
}

export interface ExerciseProgressionCurve {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  dataPoints: ProgressionDataPoint[];
  trend: 'improving' | 'plateaued' | 'declining';
  percentageGain: number;
  masteryLevel: number;
}

export interface ProgressionDataPoint {
  date: string;
  calendarDay: number;
  value: number;
  sessionId: string;
}

export interface WeeklyTrend {
  weekNumber: number;
  totalVolume: number;
  avgEnergy: number;
  avgSoreness: number;
  completionRate: number;
  prCount: number;
  avgDifficulty: number;
}

export interface FatigueDataPoint {
  date: string;
  fatigueLevel: number;
  energy: number;
  soreness: number;
}

export interface CorrelationPoint {
  date: string;
  inputValue: number;
  performanceValue: number;
  sessionId: string;
}

export interface PhaseRecord {
  phase: TrainingPhase;
  startDay: number;
  endDay?: number;
  avgScore: number;
  totalVolume: number;
  prCount: number;
}

export interface MesocycleRecord {
  number: number;
  phase: MesocyclePhase;
  startDate: string;
  endDate?: string;
  avgVolume: number;
  prCount: number;
  deloadTriggered: boolean;
}

export interface PRRecord {
  exerciseId: string;
  exerciseName: string;
  value: number;
  date: string;
  calendarDay: number;
  sessionId: string;
}

// ─── GAMIFICATION ─────────────────────────────────────────────────────────────
export interface GamificationState {
  xp: number;
  level: number;
  rank: IdentityRank;
  rankProgress: number;
  achievements: Achievement[];
  missions: Mission[];
  challenges: Challenge[];
  skillUnlocks: SkillUnlock[];
  streakDays: number;
  longestStreak: number;
  weeklyXP: number;
  monthlyXP: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  unlocked: boolean;
  unlockedAt?: string;
  category: 'workout' | 'streak' | 'pr' | 'skill' | 'milestone' | 'consistency';
  hidden: boolean;
}

export interface Mission {
  id: string;
  type: MissionType;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  target: number;
  current: number;
  status: MissionStatus;
  expiresAt?: string;
  completedAt?: string;
  linkedExerciseId?: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  startDate: string;
  endDate: string;
  target: number;
  current: number;
  completed: boolean;
  type: 'volume' | 'consistency' | 'pr' | 'skill' | 'streak';
}

export interface SkillUnlock {
  exerciseId: string;
  exerciseName: string;
  unlockedAt: string;
  calendarDay: number;
  xpGranted: number;
}

// ─── TRAINING STATE ───────────────────────────────────────────────────────────
export interface TrainingState {
  programDay: number;           // 1–90 during foundation
  calendarDay: number;          // 1+ indefinitely
  weekNumber: number;
  mesocycleNumber: number;
  mesocycleWeek: number;        // 1–4
  currentPhase: MesocyclePhase;
  trainingPhase: TrainingPhase;
  isPost90: boolean;
  totalWorkoutsCompleted: number;
  currentStreak: number;
  longestStreak: number;
  lastWorkoutDate?: string;
  nextWorkout?: GeneratedWorkout;
}

// ─── WORKOUT GENERATOR ────────────────────────────────────────────────────────
export interface GeneratedWorkout {
  id: string;
  generatedAt: string;
  forCalendarDay: number;
  focus: string;
  exercises: PlannedExercise[];
  estimatedDuration: number;
  phase: MesocyclePhase;
  warmupType: 'upper' | 'lower' | 'full';
  aiDecisionIds: string[];
  reasoning: string;
}

export interface PlannedExercise {
  exerciseId: string;
  exerciseName: string;
  sets: number;
  targetReps: number | 'max';
  targetDuration?: number;
  type: 'reps' | 'timed';
  restSeconds: number;
  progressionDecision: ProgressionDecision;
  adjustmentReason?: string;
}

// ─── COMPLETE APP DATA ────────────────────────────────────────────────────────
export type ProgressPhotoPose = 'front' | 'side' | 'back';

export interface ProgressPhoto {
  id: string;
  date: string;
  trainingDay: number;
  pose: ProgressPhotoPose;
  imageData: string;
  note?: string;
  createdAt: string;
}

export interface AppData {
  schemaVersion: number;
  profile: UserProfile;
  sessions: WorkoutSession[];
  prs: PRRecord[];
  athleteModel: AthleteModel;
  aiMemory: AIMemory;
  gamification: GamificationState;
  progressPhotos: ProgressPhoto[];
  training: TrainingState;
  // Derived caches (rebuildable)
  transformation?: TransformationState;
  adaptation?: AdaptationState;
  ai?: AIState;
  analytics?: AnalyticsState;
}

// ─── RANK THRESHOLDS ─────────────────────────────────────────────────────────
export const RANK_THRESHOLDS: Record<IdentityRank, number> = {
  Beginner:  0,
  Improving: 1000,
  Athlete:   3000,
  Advanced:  7000,
  Elite:     15000,
  Apex:      30000,
};

export const XP_PER_LEVEL = 500;

// ─── PHASE MULTIPLIERS ────────────────────────────────────────────────────────
export const PHASE_VOLUME_MULTIPLIERS: Record<MesocyclePhase, number> = {
  build:    1.0,
  overload: 1.15,
  peak:     1.1,
  deload:   0.70,
};

export const PHASE_INTENSITY_MULTIPLIERS: Record<MesocyclePhase, number> = {
  build:    1.0,
  overload: 1.1,
  peak:     1.2,
  deload:   0.75,
};
