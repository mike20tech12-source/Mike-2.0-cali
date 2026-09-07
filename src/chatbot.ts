import { AppData } from './types';

export interface ChatResponse {
  answer: string;
  followUps?: string[];
}

interface KB { keywords: string[]; answer: string; followUps?: string[]; }

const EXERCISE_KB: KB[] = [
  { keywords:['pull-up','pull up','pullup'], answer:`**Pull-ups**\n\nSTART: Hang from bar, arms fully straight, hands shoulder-width, overhand grip.\nMOVEMENT: Drive elbows DOWN toward hips — not backward. Chest rises toward bar.\nFINISH: Chin clears bar, squeeze shoulder blades, pause 1s.\nLOWER: 3 full seconds, controlled — never drop.\n\nMISTAKES: Swinging, half reps, pulling with arms not back, holding breath.\n\nCAN'T DO ONE? Negative pull-ups: jump to top, lower slowly (5-8s), 5 reps a session. You'll get your first full rep within 2-3 weeks.`, followUps:['How do negative pull-ups work?','What muscles do pull-ups train?'] },
  { keywords:['hollow hold','hollow'], answer:`**Hollow Hold**\n\nSETUP: Lie on back. Press lower back INTO floor — no gap. Raise legs ~30-45°. Raise shoulders off floor. Arms overhead.\n\nThis is the foundation of nearly every calisthenics skill — pull-ups, push-ups, handstands, L-sits all rely on this position.\n\nMISTAKES: Lower back arching (raise legs higher to fix), holding breath, bending knees unnecessarily.\n\nTOO HARD? Keep knees bent or arms by sides.`, followUps:['Why does my back arch during hollow hold?'] },
  { keywords:['plank'], answer:`**Plank**\n\nStraight line head to heels. Squeeze glutes and quads HARD. Brace core like bracing for a punch. Never hold your breath.\n\nMISTAKES: Hips sagging (squeeze glutes), hips piking (lower them), head drooping.\n\nProgression: 30s → 60s → 90s → 2min, then move to harder holds like hollow body or planche progressions.`, followUps:['What comes after plank?'] },
  { keywords:['pike push','pike'], answer:`**Pike Push-ups**\n\nInverted V position, hips high. Lower head between hands toward floor, elbows flare outward. Press back up.\n\nThis is your direct path to handstand push-ups — every rep builds real shoulder strength.\n\nMISTAKES: Hips not high enough, head going in front of hands instead of between them.`, followUps:['How do I progress to handstand push-ups?'] },
  { keywords:['l-sit','lsit','l sit'], answer:`**L-Sit**\n\nBetween two chairs, press DOWN hard. Elevate hips off floor first, then extend legs. Lean slightly forward.\n\nSTAGES: Tuck (knees bent) → one leg extended → full L-sit.\n\nThis takes months for most people — even a 5-second tuck hold is a real achievement early on. Don't rush the legs-straight version.`, followUps:['How long does it take to get an L-sit?'] },
  { keywords:['handstand'], answer:`**Handstand Wall Hold**\n\nKick up facing away from wall, or walk up facing the wall (safer for beginners). Stack wrists-elbows-shoulders-hips-feet in one line. Squeeze glutes hard. Look at floor between hands.\n\nMISTAKES: Banana shape (squeeze glutes), looking up at the wall.\n\nBuild to 60s holds before attempting freestanding.`, followUps:['How do I kick into a freestanding handstand?'] },
  { keywords:['pistol','squat'], answer:`**Pistol Squats**\n\nOne leg extended forward, squat on the standing leg to full depth. Drive through the heel.\n\nUse the pull-up bar for balance assistance while building this — reduce assistance gradually over 4-8 weeks.\n\nMISTAKES: Heel rising (ankle flexibility issue — stretch daily), knee caving inward.`, followUps:['My heel comes off the floor during pistol squats'] },
  { keywords:['burpee'], answer:`**Burpees**\n\nChest must touch floor each rep. Explosive jump with arms overhead at the top. Find a consistent rhythm rather than sprinting and dying.\n\nMost hated, most effective conditioning move in calisthenics.`, followUps:['How many burpees should I be able to do?'] },
  { keywords:['wrist'], answer:`**Wrist Pain**\n\nCommon for beginners. Warm up wrists before every session — 10 circles each direction. Spread fingers wide during push movements. If pain persists beyond 24h, rest that movement pattern.\n\nMost wrists adapt within 4-6 weeks of consistent training.`, followUps:['How do I strengthen my wrists?'] },
];

const NUTRITION_KB: KB[] = [
  { keywords:['eat','food','nutrition','protein','calorie'], answer:`**Nutrition Basics**\n\nProtein: 1.6-2g per kg bodyweight daily — eggs, chicken, fish, beans, yogurt.\nCarbs: fuel your training, don't fear them — rice, oats, fruit.\nFats: essential for hormones — nuts, avocado, olive oil.\nHydration: 2-3L water daily minimum.`, followUps:['What should I eat before training?','What should I eat after training?'] },
  { keywords:['before workout','pre workout'], answer:`**Pre-Workout**\n\n1-2 hours before: proper meal with carbs + protein (rice+chicken, oats+eggs).\n30 min before if needed: banana + small protein.\nAvoid heavy fatty meals right before training.`, followUps:['What should I eat after training?'] },
  { keywords:['after workout','post workout'], answer:`**Post-Workout**\n\nEat within 30-60 minutes. Need 20-40g protein + carbs to replenish glycogen. Rice+eggs, milk+banana, or beans on bread all work well. Don't skip this — your muscles need it to actually build.`, followUps:['How much protein do I need daily?'] },
];

const RECOVERY_KB: KB[] = [
  { keywords:['sore','soreness','doms'], answer:`**Muscle Soreness**\n\nNormal DOMS peaks 24-48h after training, fades in 2-5 days. Light movement helps more than rest. Sleep matters most.\n\nWorry if: sharp pain (not ache), joint pain, one-sided limb pain, or swelling — see a doctor.`, followUps:['Should I train through soreness?'] },
  { keywords:['sleep','recovery'], answer:`**Recovery & Sleep**\n\nYou build muscle during sleep, not during training. Aim for 7-9 hours. Growth hormone peaks during deep sleep. Poor sleep raises cortisol which breaks down muscle.`, followUps:['How many rest days do I need?'] },
  { keywords:['rest day'], answer:`**Rest Days**\n\nLight walking + the guided mobility routine in the app work better than total inactivity. Eat normally — your muscles are recovering and need fuel. Missed a day? Use the retroactive log, don't try to double up.`, followUps:['What is the mobility routine?'] },
];

const TRAINING_KB: KB[] = [
  { keywords:['plateau','stuck','not improving'], answer:`**Breaking a Plateau**\n\n1. Add a set to the stuck exercise\n2. Slow the negative to 4-5 seconds\n3. Add a pause at the hardest point\n4. Check sleep and nutrition — often the real cause\n5. Sometimes you need a deload, not more work\n\nThe app's Adaptation Engine detects this automatically after 4 sessions without improvement and adjusts your next workout.`, followUps:['What is a deload week?'] },
  { keywords:['deload'], answer:`**Deload Weeks**\n\nPlanned recovery weeks (week 4 of every mesocycle) where intensity drops to ~75%. This lets your nervous system and connective tissue catch up with your muscles, preventing injury and enabling supercompensation. Your app triggers these automatically — both on schedule and when your fatigue level or plateau count requires it.`, followUps:['Why do I feel weak during deload week?'] },
  { keywords:['progressive overload','progress'], answer:`**Progressive Overload**\n\nYour muscles only grow when forced beyond their previous capacity. Methods in order: more reps → more sets → slower tempo → harder variation → less rest.\n\nThe app's AI Coach tracks this automatically and suggests specific increases based on your actual performance.`, followUps:['How does the AI coach decide when to progress me?'] },
  { keywords:['after 90','post 90','infinite'], answer:`**After Day 90**\n\nThe app automatically switches to infinite 28-day mesocycles: Week 1 Build, Week 2 Overload, Week 3 Peak, Week 4 Deload — then repeats, personalized each time based on your athlete model, weak points, and progression history. Nothing resets. Your history carries forward forever.`, followUps:['What are the mesocycle phases?'] },
];

const ALL_KB = [...EXERCISE_KB, ...NUTRITION_KB, ...RECOVERY_KB, ...TRAINING_KB];

export function getOfflineResponse(query: string, data: AppData): ChatResponse {
  const q = query.toLowerCase().trim();
  let best: KB | null = null, bestScore = 0;
  for (const entry of ALL_KB) {
    let score = 0;
    for (const kw of entry.keywords) if (q.includes(kw)) score += kw.split(' ').length;
    if (score > bestScore) { bestScore = score; best = entry; }
  }
  if (best && bestScore > 0) return { answer: best.answer, followUps: best.followUps };

  // Context-aware fallbacks using real app state
  if (q.includes('score') || q.includes('overall')) {
    const t = data.transformation;
    if (t) return { answer: `Your Overall Score is ${t.overallScore}/100.\n\nBreakdown:\n• Strength: ${t.strengthIndex}\n• Consistency: ${t.consistencyIndex}\n• Physique: ${t.physiqueScore}\n• Progression: ${t.progressionIndex}\n\nRank: ${t.identityRank} (Level ${t.level})`, followUps:['How is Physique Score calculated?'] };
  }
  if (q.includes('pr') || q.includes('record')) {
    if (data.prs.length > 0) return { answer: `Your current PRs:\n\n${data.prs.map(p => `• ${p.exerciseName}: ${p.value}`).join('\n')}`, followUps:['How do I break my next PR?'] };
  }
  if (q.includes('fatigue') || q.includes('tired')) {
    const a = data.adaptation;
    if (a) return { answer: `Your fatigue level is ${a.fatigueLevel}/10 (${a.recoveryState}). Training readiness: ${a.trainingReadiness}%.\n\n${a.deloadActive ? `Deload is currently active: ${a.deloadReason}` : 'No deload needed right now.'}`, followUps:['What is a deload week?'] };
  }
  if (q.includes('day') && (q.includes('what') || q.includes('which'))) {
    return { answer: `You're on Day ${data.training.calendarDay}${data.training.isPost90 ? ` — in infinite training mode (Mesocycle ${data.training.mesocycleNumber}, ${data.training.currentPhase} phase)` : ` of the 90-day foundation program`}. Current streak: ${data.training.currentStreak} days.`, followUps:['What happens after day 90?'] };
  }

  return {
    answer: `I can help with:\n\n💪 Exercise technique — how to do any exercise\n🥗 Nutrition timing and basics\n😴 Recovery and soreness\n📈 Training theory — plateaus, deloads, progression\n📊 Your stats — score, PRs, fatigue level\n\nTry asking something specific like "how do I do a pull-up?" or "what's my overall score?"`,
    followUps: ['How do I do a pull-up?', 'What is my overall score?', 'What should I eat after training?', 'What is a deload week?'],
  };
}

export const SUGGESTED_QUESTIONS = [
  'How do I do a pull-up?', 'What is my overall score?', 'How do I do a hollow hold?',
  'What should I eat after training?', 'How do I break through a plateau?',
  'What is a deload week?', 'What are my current PRs?', 'What happens after day 90?',
];
