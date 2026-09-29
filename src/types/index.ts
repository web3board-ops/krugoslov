// === Core Types ===
export type Level = 'A1' | 'A2' | 'B1' | 'B2';
export type Pos = 'noun' | 'verb' | 'adj' | 'adv' | 'pron' | 'prep' | 'conj' | 'num' | 'det' | 'intj';
export type WordStatus = 'active' | 'mastered' | 'ignored';
export type LessonStatus = 'in_progress' | 'completed' | 'abandoned';
export type ExerciseStatus = 'pending' | 'evaluated';
export type ResultType = 'correct' | 'typo' | 'incorrect';
export type SuggestionState = 'suggested' | 'added' | 'ignored';
export type CTAState = 'start' | 'resume' | 'limit_reached';
export type ReportReason = 'bad_sentence' | 'wrong_translation' | 'grammar_error' | 'other';

// === Data Models ===
export interface Word {
  id: number;
  lemma: string;
  lemma_key: string;
  pos: Pos;
  level: Level | null;
  translations: string[];
}

export interface Dictionary {
  id: number;
  code: string;
  name: string;
  description: string;
  is_general: boolean;
  word_ids: number[];
}

export interface UserWord {
  id: number;
  word_id: number;
  status: WordStatus;
  stage: number; // 0-6
  due_lesson_number: number | null;
  last_reviewed_at: string | null;
  created_at: string;
}

export interface LearningProfile {
  id: number;
  user_id: string;
  level: Level;
  dictionary_id: number;
  daily_lesson_limit: number;
  last_lesson_number: number;
  created_at: string;
}

export interface ExerciseWord {
  word_id: number;
  is_target: boolean;
  is_new: boolean;
  surface_form: string | null;
  result: ResultType | null;
  user_fragment: string | null;
  stage_before: number | null;
  stage_after: number | null;
}

export interface Exercise {
  id: number;
  order_index: number;
  target_sentence: string;
  reference_translation: string;
  user_translation: string | null;
  dont_know: boolean;
  status: ExerciseStatus;
  evaluated_at: string | null;
  words: ExerciseWord[];
  suggestions: Suggestion[];
}

export interface Suggestion {
  word_id: number;
  state: SuggestionState;
}

export interface Lesson {
  id: number;
  lesson_number: number;
  status: LessonStatus;
  words_per_lesson: number;
  started_at: string;
  started_local_date: string;
  completed_at: string | null;
  completed_local_date: string | null;
  abandoned_at: string | null;
  exercises: Exercise[];
}

export interface SentenceReport {
  id: number;
  exercise_id: number;
  reason: ReportReason;
  comment: string;
  status: 'new' | 'processed';
  admin_note: string;
  created_at: string;
}

// === User ===
export interface User {
  id: string;
  email: string;
  timezone: string;
  is_onboarded: boolean;
  is_admin: boolean;
  created_at: string;
}

// === API Response Types ===
export interface DashboardSummary {
  level: Level;
  dictionary_name: string;
  today: string;
  lessons_today: number;
  daily_lesson_limit: number;
  resets_at: string;
  cta: CTAState;
  resume: { lesson_id: number; exercises_done: number; exercises_total: number } | null;
  words: { active: number; mastered: number; ignored: number };
  streak: { current: number; longest: number; today_done: boolean };
}

export interface PreviewResult {
  state: 'ready' | 'resume' | 'limit_reached' | 'no_words';
  lesson_number?: number;
  due_words?: { word_id: number; lemma: string; pos: Pos }[];
  new_words?: { word_id: number; lemma: string; pos: Pos; translations: string[] }[];
  dictionary_exhausted?: boolean;
  lesson_id?: number;
  exercises_done?: number;
  exercises_total?: number;
  resets_at?: string;
}

export interface LessonSummary {
  lesson_number: number;
  words_total: number;
  reviewed: number;
  new_words: number;
  correct: number;
  typo: number;
  incorrect: number;
  without_errors: number;
  suggestions_added: number;
  streak: { current: number; longest: number; today_done: boolean; extended_today: boolean };
}

export interface EvaluateResult {
  exercise_id: number;
  target_sentence: string;
  reference_translation: string;
  user_translation: string | null;
  words: {
    word_id: number;
    lemma: string;
    pos: Pos;
    surface_form: string;
    result: ResultType;
    user_fragment: string | null;
    translations: string[];
  }[];
  suggestions: { word_id: number; lemma: string; pos: Pos; translations: string[] }[];
  lesson_completed: boolean;
}

export interface ProfileStats {
  streak_current: number;
  streak_longest: number;
  accuracy_30d: number;
  accuracy_all: number;
  words_active: number;
  words_mastered: number;
  words_ignored: number;
  lessons_completed: number;
  heatmap: { date: string; count: number }[];
}
