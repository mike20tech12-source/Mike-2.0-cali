import {
  WorkoutSession, AdaptationState, AthleteModel,
  AdaptationTrigger, AdaptationEvent, MesocyclePhase,
} from './types';

export function calcFatigueLevel(sessions: WorkoutSession[]): number {
  if (!sessions.length) return 0;
  const recent = sessions.slice(-7);
  const avgSoreness = recent.reduce((a,s) => a + s.preCheckIn.soreness, 0) / recent.length;
  const avgEnergy   = recent.reduce((a,s) => a + s.preCheckIn.energy, 0) / recent.length;
  const density     = recent.filter(s => !s.isRestDay).length / 7;
  const failedSets  = recent.reduce((a,s) => a + s.exercises.reduce((b,e) => b + e.setTags.filter(t => t === 'failed').length, 0), 0);
  const fatigue = (avgSoreness / 3) * 3.5 + (1 - avgEnergy / 3) * 2.5 + density * 2 + Math.min(failedSets * 0.3, 2);
  return Math.min(Math.round(fatigue * 10) / 10, 10);
}

export function calcRecoveryState(fatigueLevel: number): AdaptationState['recoveryState'] {
  if (fatigueLevel >= 8) return 'overtrained';
  if (fatigueLevel >= 6) return 'fatigued';
  if (fatigueLevel >= 3) return 'normal';
  return 'fresh';
}

export function calcTrainingReadiness(fatigue: number, energy: number, soreness: number): number {
  const base = 100 - fatigue * 8;
  const energyBonus = (energy / 3) * 15;
  const sorenesspen = soreness * 8;
  return Math.max(0, Math.min(100, Math.round(base + energyBonus - sorenesspen)));
}

export function isStrongSession(session: WorkoutSession): boolean {
  const failedSets = session.exercises.flatMap(e => e.setTags).filter(t => t === 'failed').length;
  const easySets   = session.exercises.flatMap(e => e.setTags).filter(t => t === 'easy').length;
  const totalSets  = session.exercises.reduce((a,e) => a + e.sets, 0);
  return failedSets === 0 && session.preCheckIn.energy >= 2 && easySets / Math.max(totalSets,1) >= 0.5;
}

export function isWeakSession(session: WorkoutSession): boolean {
  const failedSets = session.exercises.flatMap(e => e.setTags).filter(t => t === 'failed').length;
  return failedSets >= 2 || session.preCheckIn.energy === 0 || session.preCheckIn.soreness === 3;
}

export function shouldDeload(
  sessions: WorkoutSession[],
  fatigueLevel: number,
  mesocycleWeek: number,
  plateauCount: number,
  consecutiveWeak: number,
): { deload: boolean; reason: string; type: 'planned' | 'adaptive' | 'none'; trigger: AdaptationTrigger } {
  if (mesocycleWeek === 4) return { deload:true, reason:`Planned deload — Week 4 recovery cycle`, type:'planned', trigger:'planned_deload' };
  if (fatigueLevel >= 7.5) return { deload:true, reason:`Fatigue critical (${fatigueLevel}/10) — mandatory recovery`, type:'adaptive', trigger:'fatigue_high' };
  if (consecutiveWeak >= 3) return { deload:true, reason:`${consecutiveWeak} consecutive poor sessions — recovery needed`, type:'adaptive', trigger:'performance_failing' };
  if (plateauCount >= 5) return { deload:true, reason:`${plateauCount} exercises plateaued simultaneously — deload to reset adaptation`, type:'adaptive', trigger:'plateau_detected' };
  return { deload:false, reason:'', type:'none', trigger:'progression_strong' };
}

export function calcGlobalMultiplier(
  consecutiveStrong: number,
  consecutiveWeak: number,
  deloadActive: boolean,
  phase: MesocyclePhase,
): number {
  if (deloadActive) return 0.75;
  const phaseBase = phase === 'overload' ? 1.1 : phase === 'peak' ? 1.15 : 1.0;
  if (consecutiveStrong >= 3) return Math.min(phaseBase * (1 + (consecutiveStrong - 2) * 0.04), 1.25);
  if (consecutiveWeak >= 2) return Math.max(phaseBase * (1 - consecutiveWeak * 0.05), 0.80);
  return phaseBase;
}

export function computeAdaptationState(
  sessions: WorkoutSession[],
  athleteModel: AthleteModel | null,
  mesocycleWeek: number,
  currentPhase: MesocyclePhase,
  prev: AdaptationState | null,
): AdaptationState {
  const workoutSessions = sessions.filter(s => !s.isRestDay);
  const fatigueLevel    = calcFatigueLevel(sessions);
  const recoveryState   = calcRecoveryState(fatigueLevel);
  const plateauCount    = athleteModel?.plateauHistory.filter(p => !p.resolvedAt).length ?? 0;

  const recent = workoutSessions.slice(-5);
  let consecutiveStrong = 0;
  for (let i = recent.length - 1; i >= 0; i--) { if (isStrongSession(recent[i])) consecutiveStrong++; else break; }
  let consecutiveWeak = 0;
  for (let i = recent.length - 1; i >= 0; i--) { if (isWeakSession(recent[i])) consecutiveWeak++; else break; }

  const { deload, reason, type, trigger } = shouldDeload(sessions, fatigueLevel, mesocycleWeek, plateauCount, consecutiveWeak);
  const globalMult = calcGlobalMultiplier(consecutiveStrong, consecutiveWeak, deload, currentPhase);

  const exerciseMultipliers: Record<string, number> = {};
  if (athleteModel) {
    for (const [exId, m] of Object.entries(athleteModel.exerciseMastery)) {
      if (m.isPlateaued) exerciseMultipliers[exId] = 1.1;
      else if (m.readyForProgression) exerciseMultipliers[exId] = 1.05;
      else exerciseMultipliers[exId] = 1.0;
    }
  }

  const log: AdaptationEvent[] = [...(prev?.log ?? [])];
  const now = new Date().toISOString();
  if (deload && !prev?.deloadActive) {
    log.push({ id:`adapt_${Date.now()}`, date:now, trigger, decision:'deload', reason, previousValue:`${prev?.globalDifficultyMultiplier ?? 1.0}`, newValue:'0.75' });
  }
  if (!deload && prev?.deloadActive) {
    log.push({ id:`adapt_${Date.now()}_end`, date:now, trigger:'progression_strong', decision:'maintain', reason:'Deload complete — resuming normal training', previousValue:'0.75', newValue:`${globalMult}` });
  }
  if (Math.abs(globalMult - (prev?.globalDifficultyMultiplier ?? 1.0)) > 0.04 && !deload && !prev?.deloadActive) {
    log.push({ id:`adapt_${Date.now()}_mult`, date:now, trigger: consecutiveStrong >= 3 ? 'progression_strong' : 'performance_failing', decision: globalMult > (prev?.globalDifficultyMultiplier ?? 1.0) ? 'increase_difficulty' : 'reduce_reps', reason: consecutiveStrong >= 3 ? `${consecutiveStrong} consecutive strong sessions` : `${consecutiveWeak} consecutive weak sessions`, previousValue:`${prev?.globalDifficultyMultiplier ?? 1.0}`, newValue:`${globalMult}` });
  }

  const lastSession = workoutSessions[workoutSessions.length - 1];
  const lastEnergy   = lastSession?.preCheckIn.energy ?? 2;
  const lastSoreness = lastSession?.preCheckIn.soreness ?? 1;
  const trainingReadiness = calcTrainingReadiness(fatigueLevel, lastEnergy, lastSoreness);

  return {
    fatigueLevel, recoveryState, trainingReadiness,
    deloadActive: deload, deloadReason: reason, deloadType: type,
    globalDifficultyMultiplier: globalMult, exerciseMultipliers,
    consecutiveStrongSessions: consecutiveStrong, consecutiveWeakSessions: consecutiveWeak,
    plateaus: athleteModel?.plateauHistory.filter(p => !p.resolvedAt) ?? [],
    pendingDecisions: [], log: log.slice(-100),
  };
}
