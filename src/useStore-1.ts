import { useState, useCallback } from 'react';
import { AppData, PreWorkoutCheckIn, UserProfile, ProgressPhoto, RawExerciseExecution } from './types';
import {
  initStore, persistStore, commitWorkoutSession, commitRestDay,
  commitRetroactiveLog, updateProfile as updateProfileStore,
  dismissInsight as dismissInsightStore, overrideAdjustment as overrideAdjustmentStore,
  addProgressPhoto as addProgressPhotoStore, deleteProgressPhoto as deleteProgressPhotoStore,
} from './store';
import { resetAppData, exportAppData } from './persistence';

export function useStore() {
  const [data, setData] = useState<AppData>(() => initStore());

  const persist = useCallback((next: AppData) => {
    setData(next);
    persistStore(next);
  }, []);

  const logWorkout = useCallback((
    rawExercises: RawExerciseExecution[],
    checkIn: PreWorkoutCheckIn,
    focus: string,
    note: string,
    durationMinutes: number,
    newPRValues: Record<string, number>,
  ) => {
    setData(prev => {
      const next = commitWorkoutSession(prev, rawExercises, checkIn, focus, note, durationMinutes, newPRValues);
      persistStore(next);
      return next;
    });
  }, []);

  const logRestDay = useCallback((note: string) => {
    setData(prev => {
      const next = commitRestDay(prev, note);
      persistStore(next);
      return next;
    });
  }, []);

  const logRetroactive = useCallback((calendarDay: number) => {
    setData(prev => {
      const next = commitRetroactiveLog(prev, calendarDay);
      persistStore(next);
      return next;
    });
  }, []);

  const updateProfile = useCallback((profile: Partial<UserProfile>) => {
    setData(prev => {
      const next = updateProfileStore(prev, profile);
      persistStore(next);
      return next;
    });
  }, []);

  const dismissInsight = useCallback((id: string) => {
    setData(prev => {
      const next = dismissInsightStore(prev, id);
      persistStore(next);
      return next;
    });
  }, []);

  const overrideAdjustment = useCallback((exerciseId: string) => {
    setData(prev => {
      const next = overrideAdjustmentStore(prev, exerciseId);
      persistStore(next);
      return next;
    });
  }, []);

  const addProgressPhoto = useCallback((photo: ProgressPhoto) => {
    setData(prev => addProgressPhotoStore(prev, photo));
  }, []);

  const deleteProgressPhoto = useCallback((photoId: string) => {
    setData(prev => deleteProgressPhotoStore(prev, photoId));
  }, []);

  const resetStore = useCallback(() => {
    resetAppData();
    window.location.reload();
  }, []);

  const exportData = useCallback(() => {
    exportAppData(data);
  }, [data]);

  const missedDays = (() => {
    if (!data.profile.onboarded) return [];
    const days = Array.from({ length: data.training.calendarDay - 1 }, (_, i) => i + 1);
    return days.filter(d => !data.sessions.some(s => s.calendarDay === d));
  })();

  return {
    data,
    profile: data.profile,
    sessions: data.sessions,
    prs: data.prs,
    athleteModel: data.athleteModel,
    aiMemory: data.aiMemory,
    gamification: data.gamification,
    training: data.training,
    transformation: data.transformation,
    adaptation: data.adaptation,
    ai: data.ai,
    analytics: data.analytics,
    missedDays,
    // actions
    logWorkout, logRestDay, logRetroactive, updateProfile,
    dismissInsight, overrideAdjustment, addProgressPhoto, deleteProgressPhoto, resetStore, exportData, persist,
  };
}
