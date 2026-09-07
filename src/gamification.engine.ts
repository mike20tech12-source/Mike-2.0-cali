import {
  GamificationState, Achievement, Mission, Challenge, SkillUnlock,
  WorkoutSession, PRRecord, AthleteModel,
  XP_PER_LEVEL,
} from './types';
import { getRank, getRankProgress } from './transformation.engine';

// ─── DEFAULT ACHIEVEMENTS ─────────────────────────────────────────────────────
export function createDefaultAchievements(): Achievement[] {
  return [
    { id:'first_workout',    title:'First Blood',         description:'Complete your first workout',                     icon:'🔥', xpReward:100,  unlocked:false, category:'workout',     hidden:false },
    { id:'week_1',           title:'Week One',            description:'Complete 7 training days',                       icon:'📅', xpReward:200,  unlocked:false, category:'milestone',   hidden:false },
    { id:'week_2',           title:'Two Weeks Strong',    description:'Complete 14 training days',                      icon:'💪', xpReward:300,  unlocked:false, category:'milestone',   hidden:false },
    { id:'week_4',           title:'One Month',           description:'Complete 30 training days',                      icon:'🎯', xpReward:500,  unlocked:false, category:'milestone',   hidden:false },
    { id:'week_8',           title:'Two Months',          description:'Complete 60 training days',                      icon:'⚡', xpReward:750,  unlocked:false, category:'milestone',   hidden:false },
    { id:'day_90',           title:'Mike 2.0',            description:'Complete the full 90-day program',               icon:'👑', xpReward:2000, unlocked:false, category:'milestone',   hidden:false },
    { id:'first_pr',         title:'New Heights',         description:'Set your first personal record',                 icon:'🏆', xpReward:150,  unlocked:false, category:'pr',          hidden:false },
    { id:'pr_5',             title:'Record Breaker',      description:'Set 5 personal records',                         icon:'💎', xpReward:400,  unlocked:false, category:'pr',          hidden:false },
    { id:'pr_20',            title:'Legend',              description:'Set 20 personal records',                        icon:'🌟', xpReward:1500, unlocked:false, category:'pr',          hidden:false },
    { id:'streak_7',         title:'On Fire',             description:'Maintain a 7-day training streak',              icon:'🔥', xpReward:300,  unlocked:false, category:'streak',      hidden:false },
    { id:'streak_30',        title:'Unstoppable',         description:'Maintain a 30-day training streak',             icon:'⚡', xpReward:1000, unlocked:false, category:'streak',      hidden:false },
    { id:'streak_60',        title:'Machine',             description:'Maintain a 60-day training streak',             icon:'🤖', xpReward:2000, unlocked:false, category:'streak',      hidden:false },
    { id:'athlete_rank',     title:'Athlete',             description:'Reach Athlete rank',                            icon:'🏅', xpReward:800,  unlocked:false, category:'milestone',   hidden:false },
    { id:'advanced_rank',    title:'Advanced',            description:'Reach Advanced rank',                           icon:'🥇', xpReward:1200, unlocked:false, category:'milestone',   hidden:false },
    { id:'elite_rank',       title:'Elite',               description:'Reach Elite rank',                              icon:'💫', xpReward:2000, unlocked:false, category:'milestone',   hidden:false },
    { id:'apex_rank',        title:'Apex',                description:'Reach Apex rank',                               icon:'👑', xpReward:5000, unlocked:false, category:'milestone',   hidden:false },
    { id:'first_skill',      title:'Skill Unlocked',      description:'Master your first exercise',                    icon:'🔓', xpReward:200,  unlocked:false, category:'skill',       hidden:false },
    { id:'skill_5',          title:'Skilled',             description:'Master 5 exercises',                            icon:'🎭', xpReward:600,  unlocked:false, category:'skill',       hidden:false },
    { id:'no_deload',        title:'Iron Will',           description:'Complete a mesocycle without adaptive deload',  icon:'🛡️', xpReward:600,  unlocked:false, category:'consistency', hidden:false },
    { id:'consistency_90',   title:'Consistent',          description:'Achieve 90% consistency over any 4-week period',icon:'📊', xpReward:500,  unlocked:false, category:'consistency', hidden:false },
    { id:'volume_king',      title:'Volume King',         description:'Complete a week with 1000+ total reps',         icon:'💪', xpReward:400,  unlocked:false, category:'workout',     hidden:false },
    { id:'comeback',         title:'Comeback Kid',        description:'Return after missing 5+ days and complete 3 straight', icon:'🔄', xpReward:300, unlocked:false, category:'milestone', hidden:true },
    { id:'infinite_start',   title:'Beyond 90',           description:'Begin the infinite training system',            icon:'∞',  xpReward:500,  unlocked:false, category:'milestone',   hidden:false },
  ];
}

// ─── DEFAULT MISSIONS ─────────────────────────────────────────────────────────
export function createDailyMissions(calendarDay: number): Mission[] {
  const today = new Date().toISOString().split('T')[0];
  const expiry = new Date(); expiry.setHours(23,59,59,0);
  const exp = expiry.toISOString();
  return [
    { id:`daily_workout_${today}`, type:'daily', title:'Complete Today\'s Workout', description:'Finish your scheduled workout for today', icon:'💪', xpReward:50, target:1, current:0, status:'active', expiresAt:exp },
    { id:`daily_checkin_${today}`, type:'daily', title:'Log Your Check-in', description:'Rate your energy and soreness before training', icon:'📊', xpReward:20, target:1, current:0, status:'active', expiresAt:exp },
    { id:`daily_note_${today}`,    type:'daily', title:'Write a Workout Note', description:'Record how today\'s session felt', icon:'📝', xpReward:15, target:1, current:0, status:'active', expiresAt:exp },
  ];
}

export function createWeeklyMissions(weekNumber: number): Mission[] {
  const exp = new Date(); exp.setDate(exp.getDate() + (7 - exp.getDay())); exp.setHours(23,59,59,0);
  return [
    { id:`weekly_workouts_${weekNumber}`, type:'weekly', title:'Complete 5 Workouts', description:'Finish 5 training sessions this week', icon:'🗓️', xpReward:200, target:5, current:0, status:'active', expiresAt:exp.toISOString() },
    { id:`weekly_pr_${weekNumber}`,       type:'weekly', title:'Set a Personal Record', description:'Beat a PR in any exercise this week', icon:'🏆', xpReward:150, target:1, current:0, status:'active', expiresAt:exp.toISOString() },
    { id:`weekly_volume_${weekNumber}`,   type:'weekly', title:'500 Total Reps', description:'Accumulate 500 reps across all workouts this week', icon:'📈', xpReward:100, target:500, current:0, status:'active', expiresAt:exp.toISOString() },
  ];
}

export function createSkillMission(exerciseId: string, exerciseName: string): Mission {
  return {
    id: `skill_${exerciseId}_${Date.now()}`,
    type: 'skill',
    title: `Master ${exerciseName}`,
    description: `Complete ${exerciseName} consistently with good form for 3 sessions`,
    icon: '🎯',
    xpReward: 300,
    target: 3,
    current: 0,
    status: 'active',
    linkedExerciseId: exerciseId,
  };
}

// ─── DEFAULT CHALLENGES ───────────────────────────────────────────────────────
export function createMonthlyChallenge(month: number): Challenge {
  const start = new Date(); start.setDate(1);
  const end = new Date(start); end.setMonth(end.getMonth() + 1); end.setDate(0);
  return {
    id: `monthly_challenge_${month}`,
    title: '30-Day Consistency Challenge',
    description: 'Complete 25 workouts this month',
    icon: '🏆',
    xpReward: 1000,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    target: 25,
    current: 0,
    completed: false,
    type: 'consistency',
  };
}

// ─── EVALUATE ACHIEVEMENTS ────────────────────────────────────────────────────
export function evaluateAchievements(
  achievements: Achievement[],
  sessions: WorkoutSession[],
  prs: PRRecord[],
  streak: number,
  xp: number,
  skillUnlocks: SkillUnlock[],
  isPost90: boolean,
  weeklyTrends: any[],
): { updated: Achievement[]; newlyUnlocked: Achievement[] } {
  const rank = getRank(xp);
  const workoutCount = sessions.filter(s => !s.isRestDay).length;
  const weeklyVolumes = weeklyTrends.map(t => t.totalVolume);
  const maxWeeklyVol = Math.max(...weeklyVolumes, 0);

  // Check no-adaptive-deload (complete a mesocycle without adaptive deload)
  const hadAdaptiveDeload = sessions.some(s => s.mesocycleNumber === Math.max(...sessions.map(s2 => s2.mesocycleNumber), 1) && s.phase === 'deload');

  const conditions: Record<string, boolean> = {
    first_workout:   workoutCount >= 1,
    week_1:          workoutCount >= 7,
    week_2:          workoutCount >= 14,
    week_4:          workoutCount >= 30,
    week_8:          workoutCount >= 60,
    day_90:          workoutCount >= 90,
    first_pr:        prs.length >= 1,
    pr_5:            prs.length >= 5,
    pr_20:           prs.length >= 20,
    streak_7:        streak >= 7,
    streak_30:       streak >= 30,
    streak_60:       streak >= 60,
    athlete_rank:    ['Athlete','Advanced','Elite','Apex'].includes(rank),
    advanced_rank:   ['Advanced','Elite','Apex'].includes(rank),
    elite_rank:      ['Elite','Apex'].includes(rank),
    apex_rank:       rank === 'Apex',
    first_skill:     skillUnlocks.length >= 1,
    skill_5:         skillUnlocks.length >= 5,
    no_deload:       !hadAdaptiveDeload && workoutCount >= 28,
    consistency_90:  weeklyTrends.some(t => t.completionRate >= 90),
    volume_king:     maxWeeklyVol >= 1000,
    infinite_start:  isPost90,
  };

  const newlyUnlocked: Achievement[] = [];
  const updated = achievements.map(a => {
    if (a.unlocked) return a;
    if (conditions[a.id]) {
      const unlocked = { ...a, unlocked:true, unlockedAt:new Date().toISOString() };
      newlyUnlocked.push(unlocked);
      return unlocked;
    }
    return a;
  });

  return { updated, newlyUnlocked };
}

// ─── UPDATE MISSIONS ──────────────────────────────────────────────────────────
export function updateMissions(
  missions: Mission[],
  sessions: WorkoutSession[],
  prs: PRRecord[],
  calendarDay: number,
  weekNumber: number,
): Mission[] {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const todaySessions = sessions.filter(s => s.date.startsWith(todayStr));
  const weekSessions  = sessions.filter(s => s.weekNumber === weekNumber && !s.isRestDay);
  const weekPRs       = prs.filter(p => {
    const s = sessions.find(s2 => s2.id === p.sessionId);
    return s?.weekNumber === weekNumber;
  });
  const weekVolume    = weekSessions.reduce((a,s) => a + s.totalVolume, 0);

  return missions.map(m => {
    if (m.status !== 'active') return m;
    if (m.expiresAt && new Date(m.expiresAt) < now) return { ...m, status:'expired' as const };

    let current = m.current;
    if (m.id.startsWith('daily_workout_') && m.id.includes(todayStr)) {
      current = todaySessions.filter(s => !s.isRestDay).length;
    } else if (m.id.startsWith('daily_checkin_') && m.id.includes(todayStr)) {
      current = todaySessions.length;
    } else if (m.id.startsWith('daily_note_') && m.id.includes(todayStr)) {
      current = todaySessions.filter(s => s.note && s.note.length > 5).length;
    } else if (m.id.startsWith('weekly_workouts_')) {
      current = weekSessions.length;
    } else if (m.id.startsWith('weekly_pr_')) {
      current = Math.min(weekPRs.length, m.target);
    } else if (m.id.startsWith('weekly_volume_')) {
      current = Math.min(weekVolume, m.target);
    } else if (m.type === 'skill' && m.linkedExerciseId) {
      current = sessions.filter(s => s.exercises.some(e => e.exerciseId === m.linkedExerciseId)).length;
    }

    const completed = current >= m.target;
    return {
      ...m,
      current,
      status: completed ? 'completed' as const : m.status,
      completedAt: completed && !m.completedAt ? new Date().toISOString() : m.completedAt,
    };
  });
}

// ─── UPDATE CHALLENGES ────────────────────────────────────────────────────────
export function updateChallenges(challenges: Challenge[], sessions: WorkoutSession[], prs: PRRecord[]): Challenge[] {
  const now = new Date();
  return challenges.map(c => {
    if (c.completed) return c;
    if (new Date(c.endDate) < now) return c;
    const periodSessions = sessions.filter(s => {
      const d = new Date(s.date);
      return d >= new Date(c.startDate) && d <= new Date(c.endDate);
    });
    let current = c.current;
    if (c.type === 'consistency') current = periodSessions.filter(s => !s.isRestDay).length;
    else if (c.type === 'volume') current = periodSessions.reduce((a,s) => a + s.totalVolume, 0);
    else if (c.type === 'pr') current = prs.filter(p => {
      const s = sessions.find(s2 => s2.id === p.sessionId);
      if (!s) return false;
      const d = new Date(s.date);
      return d >= new Date(c.startDate) && d <= new Date(c.endDate);
    }).length;
    const completed = current >= c.target;
    return { ...c, current, completed };
  });
}

// ─── DETECT SKILL UNLOCKS ─────────────────────────────────────────────────────
export function detectSkillUnlocks(
  athleteModel: AthleteModel,
  existing: SkillUnlock[],
  calendarDay: number,
): { unlocks: SkillUnlock[]; newUnlocks: SkillUnlock[] } {
  const existingIds = new Set(existing.map(u => u.exerciseId));
  const newUnlocks: SkillUnlock[] = [];

  for (const [exId, m] of Object.entries(athleteModel.exerciseMastery)) {
    if (m.mastered && !existingIds.has(exId)) {
      const unlock: SkillUnlock = {
        exerciseId: exId,
        exerciseName: m.exerciseName,
        unlockedAt: new Date().toISOString(),
        calendarDay,
        xpGranted: 200,
      };
      newUnlocks.push(unlock);
    }
  }

  return { unlocks: [...existing, ...newUnlocks], newUnlocks };
}

// ─── MAIN GAMIFICATION UPDATE ─────────────────────────────────────────────────
export function updateGamification(
  current: GamificationState,
  sessions: WorkoutSession[],
  prs: PRRecord[],
  athleteModel: AthleteModel,
  baseXP: number,
  calendarDay: number,
  weekNumber: number,
  isPost90: boolean,
  weeklyTrends: any[],
  earnedXPThisSession: number,
): {
  state: GamificationState;
  newAchievements: Achievement[];
  newSkillUnlocks: SkillUnlock[];
  newMissions: Mission[];
} {
  // Streak
  const sortedDays = sessions.map(s => s.calendarDay).sort((a,b) => b-a);
  let streak = 0;
  for (let i = 0; i < sortedDays.length; i++) {
    if (i === 0 && calendarDay - sortedDays[0] <= 1) streak = 1;
    else if (i > 0 && sortedDays[i-1] - sortedDays[i] <= 2) streak++;
    else break;
  }
  const longestStreak = Math.max(current.longestStreak, streak);

  // Achievements — evaluated against baseXP (pre-bonus), so rank-gated
  // achievements reflect the rank actually earned from training, not from
  // this cycle's own reward payout.
  const { updated: achievements, newlyUnlocked: newAchievements } = evaluateAchievements(
    current.achievements, sessions, prs, streak, baseXP, current.skillUnlocks, isPost90, weeklyTrends,
  );
  const achievementXP = newAchievements.reduce((a,ach) => a + ach.xpReward, 0);

  // Missions — refresh daily/weekly as needed
  let missions = updateMissions(current.missions, sessions, prs, calendarDay, weekNumber);
  const todayStr = new Date().toISOString().split('T')[0];
  const hasDailyMission = missions.some(m => m.type === 'daily' && m.id.includes(todayStr) && m.status === 'active');
  if (!hasDailyMission) {
    const newDailies = createDailyMissions(calendarDay);
    missions = [...missions.filter(m => m.type !== 'daily' || !m.id.includes(todayStr)), ...newDailies];
  }
  const hasWeeklyMission = missions.some(m => m.type === 'weekly' && m.id.includes(`_${weekNumber}`));
  if (!hasWeeklyMission) {
    missions = [...missions, ...createWeeklyMissions(weekNumber)];
  }
  const newMissions = missions.filter(m => !current.missions.some(cm => cm.id === m.id));
  const completedMissionXP = missions
    .filter(m => m.status === 'completed' && !current.missions.some(cm => cm.id === m.id && cm.status === 'completed'))
    .reduce((a,m) => a + m.xpReward, 0);

  // Challenges
  const challenges = updateChallenges(current.challenges, sessions, prs);
  const hasMonthlyChallenge = challenges.some(c => c.type === 'consistency' && !c.completed && new Date(c.endDate) > new Date());
  const finalChallenges = hasMonthlyChallenge ? challenges : [...challenges, createMonthlyChallenge(new Date().getMonth())];
  const completedChallengeXP = finalChallenges
    .filter(c => c.completed && !current.challenges.some(cc => cc.id === c.id && cc.completed))
    .reduce((a,c) => a + c.xpReward, 0);

  // Skill unlocks
  const { unlocks: skillUnlocks, newUnlocks: newSkillUnlocks } = detectSkillUnlocks(athleteModel, current.skillUnlocks, calendarDay);
  const skillXP = newSkillUnlocks.reduce((a,u) => a + u.xpGranted, 0);

  // Fold every bonus source into the running total so nothing displayed as
  // "+XP" is ever silently discarded.
  const xp = baseXP + achievementXP + completedMissionXP + completedChallengeXP + skillXP;
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const rank  = getRank(xp);
  const rankProgress = getRankProgress(xp);

  const weeklyXP  = current.weeklyXP + earnedXPThisSession + achievementXP + completedMissionXP + completedChallengeXP + skillXP;
  const monthlyXP = current.monthlyXP + earnedXPThisSession + achievementXP + completedMissionXP + completedChallengeXP + skillXP;

  return {
    state: {
      xp, level, rank, rankProgress, achievements, missions,
      challenges: finalChallenges, skillUnlocks, streakDays: streak,
      longestStreak, weeklyXP, monthlyXP,
    },
    newAchievements,
    newSkillUnlocks,
    newMissions,
  };
}
