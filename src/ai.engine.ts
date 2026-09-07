import {
  WorkoutSession, AIState, AIInsight, AIMemory, AIDecisionRecord,
  WorkoutAdjustment, WeakPoint, AthleteModel, AdaptationState,
  TransformationState, PRRecord, AIDecisionType, ProgressionDecision,
} from './types';
import { EXERCISE_REGISTRY } from './registry';

let _counter = 0;
const uid = () => `ai_${Date.now()}_${_counter++}`;

// ─── INSIGHT FACTORY ──────────────────────────────────────────────────────────
function makeInsight(
  type: AIInsight['type'],
  priority: AIInsight['priority'],
  title: string,
  message: string,
  reasoning: string,
  linkedDecisionId?: string,
): AIInsight {
  return {
    id: uid(), date: new Date().toISOString(),
    type, priority, title, message, reasoning,
    dismissed: false, actionable: true, linkedDecisionId,
  };
}

// ─── WORKOUT ADJUSTMENTS FROM ATHLETE MODEL ───────────────────────────────────
export function generateWorkoutAdjustments(
  sessions: WorkoutSession[],
  adaptation: AdaptationState,
  prs: PRRecord[],
  athleteModel: AthleteModel,
): WorkoutAdjustment[] {
  const adjustments: WorkoutAdjustment[] = [];
  if (!sessions.length) return adjustments;

  const last = sessions[sessions.length - 1];
  if (!last || last.isRestDay) return adjustments;

  for (const log of last.exercises) {
    const exId   = log.exerciseId;
    const mastery = athleteModel.exerciseMastery[exId];
    if (!mastery) continue;

    const failedSets = log.setTags.filter(t => t === 'failed').length;
    const easySets   = log.setTags.filter(t => t === 'easy').length;
    const avgReps    = log.repsPerSet.reduce((a,b) => a+b, 0) / Math.max(log.repsPerSet.length, 1);
    const ex         = EXERCISE_REGISTRY[exId];

    let decision: ProgressionDecision = 'maintain';
    let currentValue = `${Math.round(avgReps)} reps`;
    let suggestedValue = currentValue;
    let reason = '';
    let priority = 5;

    if (mastery.isPlateaued) {
      decision = 'increase_sets';
      currentValue = `${log.sets} sets`;
      suggestedValue = `${log.sets + 1} sets`;
      reason = `Plateau detected (${mastery.sessionsCompleted} sessions without improvement) — extra volume to break through`;
      priority = 9;
    } else if (mastery.readyForProgression && ex?.progressionId) {
      const nextEx = EXERCISE_REGISTRY[ex.progressionId];
      decision = 'unlock_variation';
      currentValue = log.exerciseName;
      suggestedValue = nextEx?.name ?? 'harder variation';
      reason = `Mastery threshold reached — ready for ${nextEx?.name ?? 'next progression'}`;
      priority = 10;
    } else if (easySets >= 2 && !adaptation.deloadActive && log.type === 'reps') {
      decision = 'increase_reps';
      currentValue = `${Math.round(avgReps)} reps`;
      suggestedValue = `${Math.round(avgReps * 1.1)} reps`;
      reason = `${easySets} sets felt easy — progressive overload time`;
      priority = 7;
    } else if (failedSets >= 2 && log.type === 'reps') {
      decision = 'reduce_reps';
      currentValue = `${Math.round(avgReps)} reps`;
      suggestedValue = `${Math.max(1, Math.round(avgReps * 0.9))} reps`;
      reason = `${failedSets} failed sets — reduce to maintain form and build base`;
      priority = 8;
    } else if (adaptation.deloadActive) {
      decision = 'deload';
      currentValue = `${log.sets} sets`;
      suggestedValue = `${Math.max(2, log.sets - 1)} sets`;
      reason = adaptation.deloadReason;
      priority = 10;
    }

    if (decision !== 'maintain') {
      adjustments.push({
        exerciseId: exId,
        exerciseName: log.exerciseName,
        adjustmentType: decision,
        currentValue,
        suggestedValue,
        reason,
        applied: false,
        overridden: false,
        priority,
      });
    }
  }

  return adjustments.sort((a,b) => b.priority - a.priority).slice(0, 5);
}

// ─── WEAK MUSCLE GROUP DETECTION ──────────────────────────────────────────────
export function detectWeakPoints(athleteModel: AthleteModel): WeakPoint[] {
  const { muscleBalance } = athleteModel;
  const total = muscleBalance.push + muscleBalance.pull + muscleBalance.legs + muscleBalance.core || 1;
  const targets = { push: 0.28, pull: 0.32, legs: 0.22, core: 0.18 } as const;
  const weak: WeakPoint[] = [];
  for (const [group, target] of Object.entries(targets)) {
    const actual = muscleBalance[group as keyof typeof targets] / total;
    const deficit = Math.round((target - actual) * 100);
    if (deficit >= 7) {
      weak.push({
        group: group as WeakPoint['group'],
        volumeDeficit: deficit,
        suggestion: `Add ${deficit}% more ${group} volume per week — aim for ${Math.round(target*100)}% of total`,
      });
    }
  }
  return weak;
}

// ─── GENERATE INSIGHTS ────────────────────────────────────────────────────────
export function generateInsights(
  sessions: WorkoutSession[],
  adaptation: AdaptationState,
  transformation: TransformationState,
  prs: PRRecord[],
  athleteModel: AthleteModel,
  existing: AIInsight[],
  memory: AIMemory,
): AIInsight[] {
  const insights: AIInsight[] = [];
  const recentTitles = new Set(existing.filter(i => !i.dismissed).slice(-20).map(i => i.title));
  const addIf = (ins: AIInsight) => { if (!recentTitles.has(ins.title)) { insights.push(ins); recentTitles.add(ins.title); } };

  // Deload
  if (adaptation.deloadActive) {
    addIf(makeInsight('recovery', 'high', 'Deload Week Active',
      `Intensity reduced to ${Math.round(adaptation.globalDifficultyMultiplier * 100)}%. ${adaptation.deloadReason}`,
      `Deloads prevent injury, resolve accumulated fatigue (now ${adaptation.fatigueLevel}/10), and prime you for better gains next cycle. Skipping deloads leads to overtraining.`));
  }

  // Plateaus
  for (const p of adaptation.plateaus.slice(0, 2)) {
    addIf(makeInsight('plateau', 'medium', `Plateau: ${p.exerciseName}`,
      `No improvement in ${p.sessionCount} sessions. Try slowing the negative, adding a set, or adjusting grip.`,
      `Plateau = adaptation complete at current stimulus. The muscle needs a new challenge. A technique tweak or volume increase usually breaks it within 2 sessions.`));
  }

  // Low energy pattern
  const recent5 = sessions.slice(-5);
  if (recent5.length === 5) {
    const avgEnergy = recent5.reduce((a,s) => a + s.preCheckIn.energy, 0) / 5;
    if (avgEnergy < 1.5) {
      addIf(makeInsight('recovery', 'high', 'Low Energy Pattern Detected',
        'Your last 5 sessions averaged below-normal energy. Sleep, nutrition, and stress are the main factors.',
        `Average pre-workout energy: ${avgEnergy.toFixed(1)}/3 over 5 sessions. Low energy reduces performance by 15-25% and slows recovery. Prioritise 7-9 hours of sleep and post-workout nutrition.`));
    }
  }

  // PR cluster
  const recentPRs = prs.filter(p => (Date.now() - new Date(p.date).getTime()) < 7 * 86400000);
  if (recentPRs.length >= 3) {
    addIf(makeInsight('milestone', 'medium', `${recentPRs.length} PRs This Week`,
      `Records on: ${recentPRs.map(p => p.exerciseName).join(', ')}`,
      `Multiple PRs in one week signals peak adaptation. Your body is responding exceptionally well right now. This is the time to push hard while recovery allows.`));
  }

  // Strength milestone
  if (transformation.strengthIndex >= 70) {
    addIf(makeInsight('milestone', 'low', 'Strength Index: Elite Territory',
      `Your strength index is ${transformation.strengthIndex}/100 — top tier of this program.`,
      `Calculated from PR frequency and session difficulty over the last 10 workouts. You are performing at an advanced level.`));
  }

  // Consistency
  if (transformation.consistencyIndex >= 90) {
    addIf(makeInsight('general', 'low', 'Elite Consistency',
      `${transformation.consistencyIndex}% consistency. Fewer than 5% of people sustain this.`,
      `Consistency index measures completion rate plus streak length. 90%+ puts you in elite territory for adherence.`));
  }

  // Progression ready
  for (const [exId, m] of Object.entries(athleteModel.exerciseMastery)) {
    if (m.readyForProgression && EXERCISE_REGISTRY[exId]?.progressionId) {
      const next = EXERCISE_REGISTRY[EXERCISE_REGISTRY[exId].progressionId!];
      if (next) {
        addIf(makeInsight('progression', 'high', `Ready to Progress: ${m.exerciseName}`,
          `You've mastered ${m.exerciseName}. ${next.name} is now unlocked and will appear in future workouts.`,
          `Mastery threshold met: ${m.sessionsCompleted} sessions completed, performance consistently rated good or easy. Progressive overload requires increasing the stimulus.`));
      }
    }
  }

  // Rank approaching
  if (transformation.rankProgress >= 85 && transformation.rankProgress < 100) {
    addIf(makeInsight('milestone', 'medium', `${transformation.rankProgress}% to Next Rank`,
      `You are close to reaching the next identity rank. Keep training consistently.`,
      `Rank is calculated from total XP earned through workouts, PRs, consistency, and difficulty. You earn XP every session.`));
  }

  // Fatigue warning
  if (adaptation.fatigueLevel >= 6 && !adaptation.deloadActive) {
    addIf(makeInsight('recovery', 'high', `High Fatigue: ${adaptation.fatigueLevel}/10`,
      `Fatigue level is elevated. Performance may drop and injury risk increases. Consider additional recovery.`,
      `Fatigue calculated from soreness ratings, energy levels, training density, and failed sets over the last 7 days. Above 6/10 indicates accumulated stress that needs attention.`));
  }

  // Memory-based insights — learn from past patterns
  for (const pattern of memory.patterns.slice(0, 2)) {
    if (pattern.successRate < 0.4 && pattern.frequency >= 3) {
      addIf(makeInsight('general', 'medium', 'Recurring Pattern Detected',
        `The coach has noticed: "${pattern.pattern}" — previous responses had limited success.`,
        `Based on ${pattern.frequency} occurrences in your training history, success rate was ${Math.round(pattern.successRate * 100)}%. Trying a different approach.`));
    }
  }

  const kept = existing.filter(i => !i.dismissed).slice(-12);
  return [...kept, ...insights].slice(-20);
}

// ─── RECORD DECISION IN MEMORY ────────────────────────────────────────────────
export function recordDecision(
  memory: AIMemory,
  type: AIDecisionType,
  decision: ProgressionDecision,
  reasoning: string,
  exerciseId?: string,
  previousState?: string,
  newState?: string,
): { memory: AIMemory; decisionId: string } {
  const id = uid();
  const record: AIDecisionRecord = {
    id, date: new Date().toISOString(), type, reasoning,
    exerciseId, decision,
    previousState: previousState ?? '',
    newState: newState ?? '',
  };

  const decisions = [...memory.decisions, record].slice(-200);

  // Update patterns
  const patternKey = `${type}:${decision}`;
  const patterns = [...memory.patterns];
  const existing = patterns.find(p => p.pattern === patternKey);
  if (existing) {
    existing.frequency++;
    existing.lastSeen = new Date().toISOString();
    existing.actionTaken = decision;
  } else {
    patterns.push({ pattern: patternKey, frequency: 1, lastSeen: new Date().toISOString(), actionTaken: decision, successRate: 0.5 });
  }

  return {
    memory: { ...memory, decisions, patterns, lastAnalysis: new Date().toISOString() },
    decisionId: id,
  };
}

// ─── UPDATE DECISION OUTCOME IN MEMORY ───────────────────────────────────────
export function recordDecisionOutcome(
  memory: AIMemory,
  decisionId: string,
  outcome: 'success' | 'failure' | 'neutral',
  outcomeSessionId: string,
): AIMemory {
  const decisions = memory.decisions.map(d => {
    if (d.id !== decisionId) return d;
    return { ...d, outcome, outcomeSessionId };
  });

  // Update pattern success rates
  const decision = memory.decisions.find(d => d.id === decisionId);
  const patterns = memory.patterns.map(p => {
    if (!decision || p.pattern !== `${decision.type}:${decision.decision}`) return p;
    const total = memory.decisions.filter(d => d.type === decision.type && d.decision === decision.decision && d.outcome).length;
    const successes = memory.decisions.filter(d => d.type === decision.type && d.decision === decision.decision && d.outcome === 'success').length;
    const successRate = total > 0 ? successes / total : 0.5;
    return { ...p, successRate };
  });

  return { ...memory, decisions, patterns };
}

// ─── GENERATE AI DECISION RECORDS ─────────────────────────────────────────────
export function generateAIDecisions(
  adjustments: WorkoutAdjustment[],
  memory: AIMemory,
): { decisions: AIDecisionRecord[]; updatedMemory: AIMemory } {
  let updatedMemory = { ...memory };
  const decisions: AIDecisionRecord[] = [];

  for (const adj of adjustments) {
    const { memory: m, decisionId } = recordDecision(
      updatedMemory,
      'progression',
      adj.adjustmentType,
      adj.reason,
      adj.exerciseId,
      adj.currentValue,
      adj.suggestedValue,
    );
    updatedMemory = m;
    decisions.push(updatedMemory.decisions.find(d => d.id === decisionId)!);
  }

  return { decisions, updatedMemory };
}

// ─── MAIN AI STATE COMPUTE ────────────────────────────────────────────────────
export function computeAIState(
  sessions: WorkoutSession[],
  adaptation: AdaptationState,
  transformation: TransformationState,
  prs: PRRecord[],
  athleteModel: AthleteModel,
  memory: AIMemory,
  prev: AIState | null,
): { aiState: AIState; updatedMemory: AIMemory } {
  const adjustments = generateWorkoutAdjustments(sessions, adaptation, prs, athleteModel);
  const weakMuscleGroups = detectWeakPoints(athleteModel);
  const { decisions, updatedMemory } = generateAIDecisions(adjustments, memory);
  const insights = generateInsights(sessions, adaptation, transformation, prs, athleteModel, prev?.insights ?? [], updatedMemory);

  return {
    aiState: {
      insights,
      nextWorkoutAdjustments: adjustments,
      weakMuscleGroups,
      currentDecisions: decisions,
      lastAnalysis: new Date().toISOString(),
    },
    updatedMemory,
  };
}
