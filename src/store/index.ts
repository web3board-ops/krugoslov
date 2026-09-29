import { create } from 'zustand';
import { User, LearningProfile, Word, UserWord, Lesson, Dictionary, DashboardSummary, PreviewResult, LessonSummary, EvaluateResult, ProfileStats, WordStatus, ResultType, Level, Exercise, Suggestion } from '../types';
import { MOCK_WORDS, MOCK_DICTIONARIES, SENTENCE_TEMPLATES, SUGGESTION_POOL } from '../mock/data';

// ============ SRS Algorithm ============
const INTERVALS = [1, 2, 3, 7, 11, 30];
const MAX_STAGE = 6;

function srsUpdate(stage: number, result: ResultType, lessonNumber: number): { stage: number; due_lesson_number: number | null; status: 'active' | 'mastered' } {
  const success = result === 'correct' || result === 'typo';
  if (success) {
    if (stage === MAX_STAGE) return { stage: MAX_STAGE, due_lesson_number: null, status: 'mastered' };
    const newStage = stage + 1;
    const interval = INTERVALS[Math.max(newStage - 1, 0)];
    return { stage: newStage, due_lesson_number: lessonNumber + interval, status: 'active' };
  } else {
    const newStage = Math.max(stage - 1, 0);
    const interval = INTERVALS[Math.max(newStage - 1, 0)];
    return { stage: newStage, due_lesson_number: lessonNumber + interval, status: 'active' };
  }
}

// ============ Utility ============
function getLocalDate(timezone: string): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' });
  return formatter.format(now);
}

function getResetsAt(timezone: string): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' });
  const todayStr = formatter.format(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = formatter.format(tomorrow);
  return `${tomorrowStr}T00:00:00`;
}

function calculateStreak(completedDates: string[], timezone: string): { current: number; longest: number; today_done: boolean } {
  const today = getLocalDate(timezone);
  const uniqueDates = [...new Set(completedDates)].sort().reverse();
  
  if (uniqueDates.length === 0) return { current: 0, longest: 0, today_done: false };
  
  const today_done = uniqueDates.includes(today);
  let anchor = today_done ? today : null;
  
  if (!anchor) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(yesterday);
    if (uniqueDates.includes(yStr)) anchor = yStr;
  }
  
  if (!anchor) return { current: 0, longest: uniqueDates.length > 0 ? 1 : 0, today_done: false };
  
  // Calculate current streak
  let current = 0;
  const dateSet = new Set(uniqueDates);
  let checkDate = new Date(anchor + 'T12:00:00');
  while (dateSet.has(new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(checkDate))) {
    current++;
    checkDate.setDate(checkDate.getDate() - 1);
  }
  
  // Calculate longest streak
  const sortedDates = [...new Set(completedDates)].sort();
  let longest = 1;
  let streak = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1] + 'T12:00:00');
    const curr = new Date(sortedDates[i] + 'T12:00:00');
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      streak++;
      longest = Math.max(longest, streak);
    } else {
      streak = 1;
    }
  }
  
  return { current, longest: Math.max(longest, current), today_done };
}

// ============ Store ============
interface AppState {
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  
  // Profile
  profile: LearningProfile | null;
  
  // Data
  words: Word[];
  dictionaries: Dictionary[];
  userWords: UserWord[];
  lessons: Lesson[];
  
  // Current lesson state
  currentLessonId: number | null;
  currentExerciseIndex: number;
  
  // Actions
  register: (email: string, password: string) => boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  completeOnboarding: (timezone: string, level: Level) => void;
  
  getDashboardSummary: () => DashboardSummary;
  previewLesson: () => PreviewResult;
  declineNewWord: (wordId: number) => PreviewResult;
  startLesson: (wordIds: number[]) => Lesson | null;
  getCurrentExercise: () => Exercise | null;
  evaluateExercise: (exerciseId: number, userTranslation: string | null, dontKnow: boolean) => EvaluateResult | null;
  getLessonSummary: (lessonId: number) => LessonSummary | null;
  abandonLesson: (lessonId: number) => void;
  
  getUserVocabulary: (status?: WordStatus | null, query?: string) => { words: (Word & { status: WordStatus; stage: number; due: number | null })[]; total: number };
  changeWordStatus: (wordId: number, newStatus: WordStatus) => void;
  getWordDetails: (wordId: number) => (Word & { status: WordStatus; stage: number; due: number | null; history: any[] }) | null;
  
  updateProfile: (updates: Partial<Pick<LearningProfile, 'level' | 'dictionary_id' | 'daily_lesson_limit'>>) => void;
  updateTimezone: (timezone: string) => { today: string; lessons_today: number; resets_at: string; streak: { current: number; longest: number; today_done: boolean } };
  
  getProfileStats: () => ProfileStats;
  
  addSuggestion: (exerciseId: number, wordId: number) => void;
  ignoreSuggestion: (exerciseId: number, wordId: number) => void;
  
  // Admin
  importDictionary: (name: string, words: Partial<Word>[]) => { added: number; skipped: number };
}

const STORAGE_KEY = 'wordflow_state';

function loadState(): Partial<AppState> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return {};
}

function saveState(state: Partial<AppState>) {
  try {
    const toSave = {
      user: state.user,
      profile: state.profile,
      userWords: state.userWords,
      lessons: state.lessons,
      currentLessonId: state.currentLessonId,
      currentExerciseIndex: state.currentExerciseIndex,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {}
}

export const useStore = create<AppState>((set, get) => {
  const saved = loadState();
  
  return {
    user: saved.user || null,
    isAuthenticated: !!saved.user,
    profile: saved.profile || null,
    words: MOCK_WORDS,
    dictionaries: MOCK_DICTIONARIES,
    userWords: saved.userWords || [],
    lessons: saved.lessons || [],
    currentLessonId: saved.currentLessonId || null,
    currentExerciseIndex: saved.currentExerciseIndex || 0,

    register: (email, password) => {
      const { user } = get();
      if (user) return false;
      const newUser: User = {
        id: crypto.randomUUID(),
        email: email.toLowerCase().trim(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Moscow',
        is_onboarded: false,
        is_admin: email === 'admin@wordflow.ru',
        created_at: new Date().toISOString(),
      };
      set({ user: newUser, isAuthenticated: true });
      saveState({ ...get(), user: newUser });
      return true;
    },

    login: (email, password) => {
      const saved = loadState();
      if (saved.user && saved.user.email === email.toLowerCase().trim()) {
        set({ user: saved.user, isAuthenticated: true, profile: saved.profile, userWords: saved.userWords || [], lessons: saved.lessons || [], currentLessonId: saved.currentLessonId, currentExerciseIndex: saved.currentExerciseIndex });
        return true;
      }
      // Auto-register for demo
      const newUser: User = {
        id: crypto.randomUUID(),
        email: email.toLowerCase().trim(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Moscow',
        is_onboarded: false,
        is_admin: email === 'admin@wordflow.ru',
        created_at: new Date().toISOString(),
      };
      set({ user: newUser, isAuthenticated: true });
      saveState({ ...get(), user: newUser });
      return true;
    },

    logout: () => {
      set({ user: null, isAuthenticated: false, profile: null, userWords: [], lessons: [], currentLessonId: null, currentExerciseIndex: 0 });
      localStorage.removeItem(STORAGE_KEY);
    },

    completeOnboarding: (timezone, level) => {
      const { user } = get();
      if (!user) return;
      const generalDict = MOCK_DICTIONARIES.find(d => d.is_general)!;
      const profile: LearningProfile = {
        id: 1,
        user_id: user.id,
        level,
        dictionary_id: generalDict.id,
        daily_lesson_limit: 3,
        last_lesson_number: 0,
        created_at: new Date().toISOString(),
      };
      const updatedUser = { ...user, timezone, is_onboarded: true };
      set({ user: updatedUser, profile });
      saveState({ ...get(), user: updatedUser, profile });
    },

    getDashboardSummary: () => {
      const { user, profile, userWords, lessons } = get();
      if (!user || !profile) throw new Error('Not onboarded');
      
      const today = getLocalDate(user.timezone);
      const lessonsToday = lessons.filter(l => l.started_local_date === today).length;
      const dict = MOCK_DICTIONARIES.find(d => d.id === profile.dictionary_id)!;
      
      const active = userWords.filter(w => w.status === 'active').length;
      const mastered = userWords.filter(w => w.status === 'mastered').length;
      const ignored = userWords.filter(w => w.status === 'ignored').length;
      
      const completedDates = lessons.filter(l => l.status === 'completed' && l.completed_local_date).map(l => l.completed_local_date!);
      const streak = calculateStreak(completedDates, user.timezone);
      
      const inProgress = lessons.find(l => l.status === 'in_progress');
      let cta: 'start' | 'resume' | 'limit_reached' = 'start';
      let resume = null;
      
      if (inProgress) {
        cta = 'resume';
        const done = inProgress.exercises.filter(e => e.status === 'evaluated').length;
        resume = { lesson_id: inProgress.id, exercises_done: done, exercises_total: inProgress.exercises.length };
      } else if (lessonsToday >= profile.daily_lesson_limit) {
        cta = 'limit_reached';
      }
      
      return {
        level: profile.level,
        dictionary_name: dict.name,
        today,
        lessons_today: lessonsToday,
        daily_lesson_limit: profile.daily_lesson_limit,
        resets_at: getResetsAt(user.timezone),
        cta,
        resume,
        words: { active, mastered, ignored },
        streak,
      };
    },

    previewLesson: () => {
      const { user, profile, userWords, lessons, words, dictionaries } = get();
      if (!user || !profile) return { state: 'no_words' as const };
      if (!user.is_onboarded) return { state: 'no_words' as const };
      
      // Check resume
      const inProgress = lessons.find(l => l.status === 'in_progress');
      if (inProgress) {
        const done = inProgress.exercises.filter(e => e.status === 'evaluated').length;
        return { state: 'resume' as const, lesson_id: inProgress.id, exercises_done: done, exercises_total: inProgress.exercises.length };
      }
      
      // Check limit
      const today = getLocalDate(user.timezone);
      const lessonsToday = lessons.filter(l => l.started_local_date === today).length;
      if (lessonsToday >= profile.daily_lesson_limit) {
        return { state: 'limit_reached' as const, resets_at: getResetsAt(user.timezone) };
      }
      
      const N = 5;
      const nextLessonNumber = profile.last_lesson_number + 1;
      
      // Due words
      const dueWords = userWords
        .filter(w => w.status === 'active' && w.due_lesson_number !== null && w.due_lesson_number <= nextLessonNumber)
        .slice(0, N);
      
      // New words
      const dict = dictionaries.find(d => d.id === profile.dictionary_id)!;
      const existingWordIds = new Set(userWords.map(w => w.word_id));
      const levelBelow: Record<string, string[]> = { 'A1': ['A1'], 'A2': ['A1', 'A2'], 'B1': ['A2', 'B1'], 'B2': ['B1', 'B2'] };
      const allowedLevels = levelBelow[profile.level] || ['A1'];
      
      let candidateNewWords = words.filter(w => {
        if (!dict.word_ids.includes(w.id)) return false;
        if (existingWordIds.has(w.id)) return false;
        if (w.level && !allowedLevels.includes(w.level)) return false;
        return true;
      });
      
      // Deterministic shuffle based on lesson number
      const seed = `${profile.id}:${nextLessonNumber}`;
      candidateNewWords = candidateNewWords.sort((a, b) => {
        const hashA = simpleHash(`${seed}:${a.id}`);
        const hashB = simpleHash(`${seed}:${b.id}`);
        return hashA - hashB;
      });
      
      const needed = N - dueWords.length;
      const newWords = candidateNewWords.slice(0, needed);
      
      if (dueWords.length === 0 && newWords.length === 0) {
        return { state: 'no_words' as const };
      }
      
      const dictionary_exhausted = newWords.length < needed && candidateNewWords.length <= needed;
      
      return {
        state: 'ready' as const,
        lesson_number: nextLessonNumber,
        due_words: dueWords.map(w => {
          const word = words.find(ww => ww.id === w.word_id)!;
          return { word_id: w.word_id, lemma: word.lemma, pos: word.pos };
        }),
        new_words: newWords.map(w => ({ word_id: w.id, lemma: w.lemma, pos: w.pos, translations: w.translations })),
        dictionary_exhausted,
      };
    },

    declineNewWord: (wordId) => {
      const { user, profile, userWords, words } = get();
      if (!user || !profile) return { state: 'no_words' as const };
      
      const existing = userWords.find(w => w.word_id === wordId);
      if (!existing) {
        const newUW: UserWord = {
          id: Date.now(),
          word_id: wordId,
          status: 'ignored',
          stage: 0,
          due_lesson_number: null,
          last_reviewed_at: null,
          created_at: new Date().toISOString(),
        };
        set({ userWords: [...userWords, newUW] });
      }
      
      saveState({ ...get() });
      return get().previewLesson();
    },

    startLesson: (wordIds) => {
      const { user, profile, userWords, lessons, words } = get();
      if (!user || !profile) return null;
      
      const nextLessonNumber = profile.last_lesson_number + 1;
      const today = getLocalDate(user.timezone);
      
      // Create exercises (groups of 2-3)
      const N = wordIds.length;
      const k = Math.ceil(N / 3);
      const groupSizes: number[] = [];
      const baseSize = Math.floor(N / k);
      const remainder = N % k;
      for (let i = 0; i < k; i++) {
        groupSizes.push(baseSize + (i < remainder ? 1 : 0));
      }
      
      // Deterministic shuffle
      const seed = `${profile.id}:${nextLessonNumber}`;
      const shuffled = [...wordIds].sort((a, b) => simpleHash(`${seed}:${a}`) - simpleHash(`${seed}:${b}`));
      
      const exercises: Exercise[] = [];
      let idx = 0;
      for (let g = 0; g < groupSizes.length; g++) {
        const groupWordIds = shuffled.slice(idx, idx + groupSizes[g]);
        idx += groupSizes[g];
        
        // Find sentence template
        const key = groupWordIds.join(',');
        const templates = SENTENCE_TEMPLATES[key] || SENTENCE_TEMPLATES[groupWordIds[0].toString()];
        const template = templates ? templates[Math.floor(Math.random() * templates.length)] : null;
        
        let sentence = '';
        let translation = '';
        const exerciseWords = groupWordIds.map(wid => {
          const word = words.find(w => w.id === wid)!;
          const isExisting = userWords.some(uw => uw.word_id === wid);
          let surfaceForm = word.lemma;
          
          if (template && template.forms[wid]) {
            surfaceForm = template.forms[wid];
          }
          
          return {
            word_id: wid,
            is_target: true,
            is_new: !isExisting,
            surface_form: surfaceForm,
            result: null as ResultType | null,
            user_fragment: null,
            stage_before: null as number | null,
            stage_after: null as number | null,
          };
        });
        
        if (template) {
          sentence = template.sentence;
          translation = template.translation;
        } else {
          // Fallback sentence
          const wordObjs = groupWordIds.map(id => words.find(w => w.id === id)!);
          sentence = `The ${wordObjs.map(w => w.lemma).join(' and ')} example.`;
          translation = `Пример с ${wordObjs.map(w => w.translations[0]).join(' и ')}.`;
        }
        
        exercises.push({
          id: Date.now() + g,
          order_index: g,
          target_sentence: sentence,
          reference_translation: translation,
          user_translation: null,
          dont_know: false,
          status: 'pending',
          evaluated_at: null,
          words: exerciseWords,
          suggestions: [],
        });
      }
      
      const lesson: Lesson = {
        id: Date.now(),
        lesson_number: nextLessonNumber,
        status: 'in_progress',
        words_per_lesson: N,
        started_at: new Date().toISOString(),
        started_local_date: today,
        completed_at: null,
        completed_local_date: null,
        abandoned_at: null,
        exercises,
      };
      
      // Add new words to userWords
      const newUserWords = [...userWords];
      wordIds.forEach(wid => {
        if (!userWords.some(uw => uw.word_id === wid)) {
          newUserWords.push({
            id: Date.now() + wid,
            word_id: wid,
            status: 'active',
            stage: 0,
            due_lesson_number: nextLessonNumber,
            last_reviewed_at: null,
            created_at: new Date().toISOString(),
          });
        }
      });
      
      const updatedProfile = { ...profile, last_lesson_number: nextLessonNumber };
      
      set({
        lessons: [...lessons, lesson],
        userWords: newUserWords,
        profile: updatedProfile,
        currentLessonId: lesson.id,
        currentExerciseIndex: 0,
      });
      saveState({ ...get() });
      
      return lesson;
    },

    getCurrentExercise: () => {
      const { lessons, currentLessonId, currentExerciseIndex } = get();
      const lesson = lessons.find(l => l.id === currentLessonId);
      if (!lesson) return null;
      return lesson.exercises[currentExerciseIndex] || null;
    },

    evaluateExercise: (exerciseId, userTranslation, dontKnow) => {
      const { lessons, userWords, words, currentLessonId, user } = get();
      if (!user) return null;
      
      const lessonIdx = lessons.findIndex(l => l.id === currentLessonId);
      if (lessonIdx === -1) return null;
      const lesson = { ...lessons[lessonIdx] };
      
      const exIdx = lesson.exercises.findIndex(e => e.id === exerciseId);
      if (exIdx === -1) return null;
      
      const exercise = { ...lesson.exercises[exIdx] };
      
      // Evaluate each target word
      const evaluatedWords = exercise.words.map(ew => {
        if (!ew.is_target) return ew;
        
        const word = words.find(w => w.id === ew.word_id)!;
        const uw = userWords.find(u => u.word_id === ew.word_id);
        const stageBefore = uw ? uw.stage : 0;
        
        let result: ResultType;
        let userFragment: string | null = null;
        
        if (dontKnow) {
          result = 'incorrect';
        } else if (userTranslation) {
          // Simple evaluation: check if any translation appears in user input
          const input = userTranslation.toLowerCase();
          const hasTranslation = word.translations.some(t => input.includes(t.toLowerCase()));
          
          if (hasTranslation) {
            // Check for typo (simple heuristic)
            const exactMatch = word.translations.some(t => {
              const tl = t.toLowerCase();
              return input.includes(tl);
            });
            result = exactMatch ? 'correct' : 'typo';
            userFragment = word.translations.find(t => input.includes(t.toLowerCase())) || null;
          } else {
            result = 'incorrect';
          }
        } else {
          result = 'incorrect';
        }
        
        // SRS update
        const srsResult = srsUpdate(stageBefore, result, lesson.lesson_number);
        
        // Update userWords
        const uwIdx = userWords.findIndex(u => u.word_id === ew.word_id);
        const updatedUserWords = [...get().userWords];
        if (uwIdx >= 0) {
          updatedUserWords[uwIdx] = {
            ...updatedUserWords[uwIdx],
            stage: srsResult.stage,
            due_lesson_number: srsResult.due_lesson_number,
            status: srsResult.status as WordStatus,
            last_reviewed_at: new Date().toISOString(),
          };
        }
        
        return {
          ...ew,
          result,
          user_fragment: userFragment,
          stage_before: stageBefore,
          stage_after: srsResult.stage,
        };
      });
      
      // Generate suggestions (simulate LLM)
      const targetWordIds = new Set(exercise.words.filter(w => w.is_target).map(w => w.word_id));
      const existingIds = new Set(get().userWords.map(w => w.word_id));
      const suggestions = SUGGESTION_POOL
        .filter(s => !targetWordIds.has(s.word_id) && !existingIds.has(s.word_id))
        .slice(0, 2)
        .map(s => ({ word_id: s.word_id, state: 'suggested' as const }));
      
      exercise.words = evaluatedWords;
      exercise.user_translation = dontKnow ? null : userTranslation;
      exercise.dont_know = dontKnow;
      exercise.status = 'evaluated';
      exercise.evaluated_at = new Date().toISOString();
      exercise.suggestions = suggestions;
      
      lesson.exercises = [...lesson.exercises];
      lesson.exercises[exIdx] = exercise;
      
      // Check if lesson is complete
      const allDone = lesson.exercises.every(e => e.status === 'evaluated');
      if (allDone) {
        lesson.status = 'completed';
        lesson.completed_at = new Date().toISOString();
        lesson.completed_local_date = getLocalDate(user.timezone);
      }
      
      const updatedLessons = [...lessons];
      updatedLessons[lessonIdx] = lesson;
      
      // Update userWords in store (SRS already applied above in evaluatedWords loop)
      const newUserWords = [...get().userWords];
      evaluatedWords.forEach(ew => {
        if (!ew.is_target) return;
        const uwIdx = newUserWords.findIndex(u => u.word_id === ew.word_id);
        if (uwIdx >= 0 && ew.stage_after !== null) {
          newUserWords[uwIdx] = {
            ...newUserWords[uwIdx],
            stage: ew.stage_after,
            due_lesson_number: ew.stage_after === 6 && ew.result !== 'incorrect' ? null : (lesson.lesson_number + (ew.stage_after > 0 ? INTERVALS[Math.max(ew.stage_after - 1, 0)] : INTERVALS[0])),
            status: (ew.stage_after === 6 && ew.result !== 'incorrect') ? 'mastered' : 'active',
            last_reviewed_at: new Date().toISOString(),
          };
        }
      });
      
      // Move to next exercise
      const nextExIdx = get().currentExerciseIndex + 1;
      
      set({
        lessons: updatedLessons,
        userWords: newUserWords,
        currentExerciseIndex: allDone ? 0 : nextExIdx,
        currentLessonId: allDone ? null : currentLessonId,
      });
      saveState({ ...get() });
      
      // Build result
      const resultWords = evaluatedWords.filter(w => w.is_target).map(w => {
        const word = words.find(ww => ww.id === w.word_id)!;
        return {
          word_id: w.word_id,
          lemma: word.lemma,
          pos: word.pos,
          surface_form: w.surface_form || word.lemma,
          result: w.result!,
          user_fragment: w.user_fragment,
          translations: word.translations,
        };
      });
      
      const resultSuggestions = suggestions.map(s => {
        const word = words.find(w => w.id === s.word_id)!;
        return { word_id: s.word_id, lemma: word.lemma, pos: word.pos, translations: word.translations };
      });
      
      return {
        exercise_id: exerciseId,
        target_sentence: exercise.target_sentence,
        reference_translation: exercise.reference_translation,
        user_translation: exercise.user_translation,
        words: resultWords,
        suggestions: resultSuggestions,
        lesson_completed: allDone,
      };
    },

    getLessonSummary: (lessonId) => {
      const { lessons, userWords, user } = get();
      const lesson = lessons.find(l => l.id === lessonId);
      if (!lesson || lesson.status !== 'completed' || !user) return null;
      
      const allWords = lesson.exercises.flatMap(e => e.words.filter(w => w.is_target));
      const newWords = allWords.filter(w => w.is_new).length;
      const reviewed = allWords.length - newWords;
      const correct = allWords.filter(w => w.result === 'correct').length;
      const typo = allWords.filter(w => w.result === 'typo').length;
      const incorrect = allWords.filter(w => w.result === 'incorrect').length;
      const without_errors = lesson.exercises.filter(e => e.words.filter(w => w.is_target).every(w => w.result === 'correct' || w.result === 'typo')).length;
      const suggestionsAdded = lesson.exercises.flatMap(e => e.suggestions).filter(s => s.state === 'added').length;
      
      const completedDates = lessons.filter(l => l.status === 'completed' && l.completed_local_date).map(l => l.completed_local_date!);
      const streak = calculateStreak(completedDates, user.timezone);
      const extended_today = lesson.completed_local_date === getLocalDate(user.timezone) && 
        !lessons.some(l => l.status === 'completed' && l.id !== lessonId && l.completed_local_date === lesson.completed_local_date && l.completed_at! < lesson.completed_at!);
      
      return {
        lesson_number: lesson.lesson_number,
        words_total: allWords.length,
        reviewed,
        new_words: newWords,
        correct,
        typo,
        incorrect,
        without_errors,
        suggestions_added: suggestionsAdded,
        streak: { ...streak, extended_today },
      };
    },

    abandonLesson: (lessonId) => {
      const { lessons } = get();
      const idx = lessons.findIndex(l => l.id === lessonId);
      if (idx === -1) return;
      
      const updated = [...lessons];
      updated[idx] = { ...updated[idx], status: 'abandoned', abandoned_at: new Date().toISOString() };
      set({ lessons: updated, currentLessonId: null, currentExerciseIndex: 0 });
      saveState({ ...get() });
    },

    getUserVocabulary: (status, query) => {
      const { userWords, words } = get();
      let filtered = userWords;
      if (status) filtered = filtered.filter(w => w.status === status);
      
      let result = filtered.map(uw => {
        const word = words.find(w => w.id === uw.word_id)!;
        return { ...word, status: uw.status, stage: uw.stage, due: uw.due_lesson_number };
      });
      
      if (query) {
        const q = query.toLowerCase();
        result = result.filter(w => w.lemma.toLowerCase().includes(q) || w.translations.some(t => t.toLowerCase().includes(q)));
      }
      
      result.sort((a, b) => a.lemma.localeCompare(b.lemma));
      return { words: result, total: result.length };
    },

    changeWordStatus: (wordId, newStatus) => {
      const { userWords, profile } = get();
      if (!profile) return;
      
      const idx = userWords.findIndex(w => w.word_id === wordId);
      if (idx === -1) return;
      
      const updated = [...userWords];
      if (newStatus === 'ignored') {
        updated[idx] = { ...updated[idx], status: 'ignored', due_lesson_number: null };
      } else if (newStatus === 'active') {
        updated[idx] = { ...updated[idx], status: 'active', stage: 0, due_lesson_number: profile.last_lesson_number + 1 };
      }
      
      set({ userWords: updated });
      saveState({ ...get() });
    },

    getWordDetails: (wordId) => {
      const { userWords, words, lessons } = get();
      const uw = userWords.find(w => w.word_id === wordId);
      const word = words.find(w => w.id === wordId);
      if (!uw || !word) return null;
      
      // Get history
      const history: any[] = [];
      lessons.forEach(lesson => {
        lesson.exercises.forEach(ex => {
          const ew = ex.words.find(w => w.word_id === wordId && w.is_target);
          if (ew) {
            history.push({
              sentence: ex.target_sentence,
              translation: ex.reference_translation,
              surface_form: ew.surface_form,
              result: ew.result,
              date: lesson.completed_at || lesson.started_at,
            });
          }
        });
      });
      
      return { ...word, status: uw.status, stage: uw.stage, due: uw.due_lesson_number, history };
    },

    updateProfile: (updates) => {
      const { profile } = get();
      if (!profile) return;
      set({ profile: { ...profile, ...updates } });
      saveState({ ...get() });
    },

    updateTimezone: (timezone) => {
      const { user, lessons } = get();
      if (!user) return { today: '', lessons_today: 0, resets_at: '', streak: { current: 0, longest: 0, today_done: false } };
      
      const updatedUser = { ...user, timezone };
      set({ user: updatedUser });
      saveState({ ...get() });
      
      const today = getLocalDate(timezone);
      const lessonsToday = lessons.filter(l => l.started_local_date === today).length;
      const completedDates = lessons.filter(l => l.status === 'completed' && l.completed_local_date).map(l => l.completed_local_date!);
      const streak = calculateStreak(completedDates, timezone);
      
      return { today, lessons_today: lessonsToday, resets_at: getResetsAt(timezone), streak };
    },

    getProfileStats: () => {
      const { userWords, lessons, user } = get();
      if (!user) return { streak_current: 0, streak_longest: 0, accuracy_30d: 0, accuracy_all: 0, words_active: 0, words_mastered: 0, words_ignored: 0, lessons_completed: 0, heatmap: [] };
      
      const completedDates = lessons.filter(l => l.status === 'completed' && l.completed_local_date).map(l => l.completed_local_date!);
      const streak = calculateStreak(completedDates, user.timezone);
      
      const allResults = lessons.flatMap(l => l.exercises.flatMap(e => e.words.filter(w => w.is_target && w.result)));
      const correct30 = allResults.filter(w => {
        const ex = lessons.flatMap(l => l.exercises).find(e => e.words.some(ew => ew.word_id === w.word_id));
        return ex && (w.result === 'correct' || w.result === 'typo');
      }).length;
      
      const accuracy_all = allResults.length > 0 ? Math.round((allResults.filter(w => w.result === 'correct' || w.result === 'typo').length / allResults.length) * 100) : 0;
      
      // Heatmap
      const heatmap: { date: string; count: number }[] = [];
      const dateCounts: Record<string, number> = {};
      completedDates.forEach(d => { dateCounts[d] = (dateCounts[d] || 0) + 1; });
      Object.entries(dateCounts).forEach(([date, count]) => heatmap.push({ date, count }));
      
      return {
        streak_current: streak.current,
        streak_longest: streak.longest,
        accuracy_30d: accuracy_all,
        accuracy_all,
        words_active: userWords.filter(w => w.status === 'active').length,
        words_mastered: userWords.filter(w => w.status === 'mastered').length,
        words_ignored: userWords.filter(w => w.status === 'ignored').length,
        lessons_completed: lessons.filter(l => l.status === 'completed').length,
        heatmap,
      };
    },

    addSuggestion: (exerciseId, wordId) => {
      const { lessons, userWords, profile } = get();
      if (!profile) return;
      
      const updatedLessons = lessons.map(l => ({
        ...l,
        exercises: l.exercises.map(e => {
          if (e.id !== exerciseId) return e;
          return {
            ...e,
            suggestions: e.suggestions.map(s => s.word_id === wordId ? { ...s, state: 'added' as const } : s),
          };
        }),
      }));
      
      // Add word to userWords if not exists
      const newUserWords = [...userWords];
      if (!newUserWords.some(w => w.word_id === wordId)) {
        const lastLesson = lessons.find(l => l.exercises.some(e => e.id === exerciseId));
        newUserWords.push({
          id: Date.now(),
          word_id: wordId,
          status: 'active',
          stage: 0,
          due_lesson_number: (lastLesson?.lesson_number || profile.last_lesson_number) + 1,
          last_reviewed_at: null,
          created_at: new Date().toISOString(),
        });
      }
      
      set({ lessons: updatedLessons, userWords: newUserWords });
      saveState({ ...get() });
    },

    ignoreSuggestion: (exerciseId, wordId) => {
      const { lessons, userWords } = get();
      
      const updatedLessons = lessons.map(l => ({
        ...l,
        exercises: l.exercises.map(e => {
          if (e.id !== exerciseId) return e;
          return {
            ...e,
            suggestions: e.suggestions.map(s => s.word_id === wordId ? { ...s, state: 'ignored' as const } : s),
          };
        }),
      }));
      
      // Add as ignored
      const newUserWords = [...userWords];
      if (!newUserWords.some(w => w.word_id === wordId)) {
        newUserWords.push({
          id: Date.now(),
          word_id: wordId,
          status: 'ignored',
          stage: 0,
          due_lesson_number: null,
          last_reviewed_at: null,
          created_at: new Date().toISOString(),
        });
      }
      
      set({ lessons: updatedLessons, userWords: newUserWords });
      saveState({ ...get() });
    },

    importDictionary: (name, newWords) => {
      // Admin: add words to general dictionary
      let added = 0;
      let skipped = 0;
      const existingIds = new Set(MOCK_WORDS.map(w => w.lemma_key + ':' + w.pos));
      
      newWords.forEach(w => {
        const key = (w.lemma || '').toLowerCase().trim() + ':' + w.pos;
        if (existingIds.has(key)) {
          skipped++;
        } else {
          added++;
        }
      });
      
      return { added, skipped };
    },
  };
});

// Simple hash for deterministic ordering
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}
