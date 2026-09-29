import { create } from 'zustand';
import { User, LearningProfile } from '../types';
import { authApi, onboardingApi, dashboardApi, lessonApi, vocabularyApi, profileApi, settingsApi, adminApi, setAccessToken } from '../api/client';

interface AppState {
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  
  // Profile
  profile: LearningProfile | null;
  
  // Current lesson state
  currentLessonId: number | null;
  currentExerciseId: number | null;
  
  // Actions
  setAccessToken: (token: string | null) => void;
  register: (email: string, password: string) => Promise<boolean>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  completeOnboarding: (timezone: string, level: string) => Promise<void>;
  
  getDashboardSummary: () => Promise<any>;
  previewLesson: () => Promise<any>;
  declineNewWord: (wordId: number) => Promise<any>;
  startLesson: (wordIds: number[]) => Promise<any>;
  evaluateExercise: (exerciseId: number, userTranslation: string | null, dontKnow: boolean) => Promise<any>;
  getLessonSummary: (lessonId: number) => Promise<any>;
  abandonLesson: (lessonId: number) => Promise<void>;
  
  getUserVocabulary: (status?: string, query?: string, page?: number) => Promise<any>;
  changeWordStatus: (wordId: number, newStatus: string) => Promise<void>;
  getWordDetails: (wordId: number) => Promise<any>;
  
  updateProfile: (updates: any) => Promise<void>;
  updateTimezone: (timezone: string) => Promise<any>;
  
  getProfileStats: () => Promise<any>;
  getDictionaries: () => Promise<any[]>;
  
  addSuggestion: (exerciseId: number, wordId: number) => Promise<void>;
  ignoreSuggestion: (exerciseId: number, wordId: number) => Promise<void>;
  
  // Admin
  importDictionary: (file: File, dryRun?: boolean) => Promise<any>;
}

export const useStore = create<AppState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  profile: null,
  currentLessonId: null,
  currentExerciseId: null,

  setAccessToken: (token) => {
    setAccessToken(token);
  },

  register: async (email, password) => {
    try {
      const response = await authApi.register(email, password);
      setAccessToken(response.access_token);
      await get().checkAuth();
      return true;
    } catch (error) {
      console.error('Register failed:', error);
      return false;
    }
  },

  login: async (email, password) => {
    try {
      const response = await authApi.login(email, password);
      setAccessToken(response.access_token);
      await get().checkAuth();
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
    setAccessToken(null);
    set({ user: null, isAuthenticated: false, profile: null, currentLessonId: null, currentExerciseId: null });
  },

  checkAuth: async () => {
    try {
      const user = await authApi.getMe();
      set({ user, isAuthenticated: true });
    } catch (error) {
      set({ user: null, isAuthenticated: false });
    }
  },

  completeOnboarding: async (timezone, level) => {
    await onboardingApi.complete(timezone, level);
    await get().checkAuth();
  },

  getDashboardSummary: async () => {
    return await dashboardApi.getSummary();
  },

  previewLesson: async () => {
    return await lessonApi.preview();
  },

  declineNewWord: async (wordId) => {
    return await lessonApi.declineNewWord(wordId);
  },

  startLesson: async (wordIds) => {
    const result = await lessonApi.start(wordIds);
    set({
      currentLessonId: result.lesson_id,
      currentExerciseId: result.current_exercise?.exercise_id || null,
    });
    return result;
  },

  evaluateExercise: async (exerciseId, userTranslation, dontKnow) => {
    return await lessonApi.evaluate(exerciseId, userTranslation, dontKnow);
  },

  getLessonSummary: async (lessonId) => {
    return await lessonApi.getSummary(lessonId);
  },

  abandonLesson: async (lessonId) => {
    await lessonApi.abandon(lessonId);
    set({ currentLessonId: null, currentExerciseId: null });
  },

  getUserVocabulary: async (status, query, page) => {
    return await vocabularyApi.getList(status, query, page);
  },

  changeWordStatus: async (wordId, newStatus) => {
    await vocabularyApi.changeStatus(wordId, newStatus);
  },

  getWordDetails: async (wordId) => {
    return await vocabularyApi.getWord(wordId);
  },

  updateProfile: async (updates) => {
    await settingsApi.updateLearningProfile(updates);
  },

  updateTimezone: async (timezone) => {
    return await settingsApi.updateTimezone(timezone);
  },

  getProfileStats: async () => {
    return await profileApi.getStats();
  },

  getDictionaries: async () => {
    return await settingsApi.getDictionaries();
  },

  addSuggestion: async (exerciseId, wordId) => {
    await lessonApi.handleSuggestion(exerciseId, wordId, 'add');
  },

  ignoreSuggestion: async (exerciseId, wordId) => {
    await lessonApi.handleSuggestion(exerciseId, wordId, 'ignore');
  },

  importDictionary: async (file, dryRun) => {
    return await adminApi.importDictionary(file, dryRun);
  },
}));
