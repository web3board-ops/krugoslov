import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { ChevronDown, ChevronUp, Plus, X, Check, AlertCircle } from 'lucide-react';
import { ResultType } from '../types';

export function ReviewPage() {
  const { lessonId, exerciseId } = useParams();
  const navigate = useNavigate();
  const { lessons, words, addSuggestion, ignoreSuggestion } = useStore();
  const [showTranslation, setShowTranslation] = useState(false);

  const lesson = lessons.find(l => l.id === Number(lessonId));
  const exercise = lesson?.exercises.find(e => e.id === Number(exerciseId));

  if (!lesson || !exercise) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--color-text-secondary)]">Упражнение не найдено</p>
      </div>
    );
  }

  const exerciseIndex = lesson.exercises.findIndex(e => e.id === exercise.id);
  const isLast = exerciseIndex === lesson.exercises.length - 1;
  const targetWords = exercise.words.filter(w => w.is_target);

  const getResultColor = (result: ResultType | null) => {
    switch (result) {
      case 'correct': return 'text-green-600 bg-green-50 border-green-200';
      case 'typo': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'incorrect': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getResultIcon = (result: ResultType | null) => {
    switch (result) {
      case 'correct': return '🟢';
      case 'typo': return '🟠';
      case 'incorrect': return '🔴';
      default: return '⚪';
    }
  };

  const getResultText = (result: ResultType | null) => {
    switch (result) {
      case 'correct': return 'Верно';
      case 'typo': return 'Опечатка';
      case 'incorrect': return 'Неверно';
      default: return '';
    }
  };

  const handleNext = () => {
    if (isLast) {
      navigate(`/lesson/${lessonId}/complete`);
    } else {
      // Find next pending exercise
      const nextExercise = lesson.exercises.find(e => e.status === 'pending');
      if (nextExercise) {
        navigate(`/lesson/${lessonId}/exercise/${nextExercise.id}`);
      } else {
        navigate(`/lesson/${lessonId}/complete`);
      }
    }
  };

  // Render sentence with highlighted target words
  const renderSentence = () => {
    let html = exercise.target_sentence;
    targetWords.forEach(w => {
      if (w.surface_form) {
        const colorClass = w.result === 'correct' ? 'bg-green-100 text-green-800' :
                          w.result === 'typo' ? 'bg-amber-100 text-amber-800' :
                          'bg-red-100 text-red-800';
        const regex = new RegExp(`\\b(${w.surface_form.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'gi');
        html = html.replace(regex, `<mark class="${colorClass} px-1 rounded font-medium">$1</mark>`);
      }
    });
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  };

  return (
    <div className="min-h-screen flex flex-col max-w-[640px] mx-auto bg-white animate-slide-up">
      <div className="flex-1 px-4 py-6 overflow-y-auto">
        {/* Sentence */}
        <div className="mb-6">
          <p className="text-sm text-[var(--color-text-secondary)] mb-2">Предложение:</p>
          <div className="text-lg font-medium leading-relaxed p-4 bg-gray-50 rounded-xl">
            {renderSentence()}
          </div>
        </div>

        {/* Word results */}
        <div className="space-y-3 mb-6">
          {targetWords.map(w => {
            const word = words.find(ww => ww.id === w.word_id);
            if (!word) return null;
            return (
              <div key={w.word_id} className={`p-3 rounded-xl border ${getResultColor(w.result)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{getResultIcon(w.result)}</span>
                    <span className="font-medium">{word.lemma}</span>
                    <span className="text-xs opacity-70">{w.surface_form !== word.lemma ? `(${w.surface_form})` : ''}</span>
                  </div>
                  <span className="text-xs font-medium">{getResultText(w.result)}</span>
                </div>
                <div className="mt-1 text-sm">
                  {w.user_fragment ? (
                    <span>Ваш перевод: <span className="font-medium">«{w.user_fragment}»</span></span>
                  ) : (
                    <span className="opacity-70">не переведено</span>
                  )}
                </div>
                <div className="mt-1 text-xs opacity-70">
                  Переводы: {word.translations.join(', ')}
                </div>
              </div>
            );
          })}
        </div>

        {/* Reference translation (under spoiler) */}
        <div className="mb-6">
          <button
            onClick={() => setShowTranslation(!showTranslation)}
            className="flex items-center gap-2 text-sm text-[var(--color-primary)] font-medium"
          >
            {showTranslation ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            Эталонный перевод
          </button>
          {showTranslation && (
            <div className="mt-2 p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-sm animate-fade-in">
              {exercise.reference_translation}
            </div>
          )}
        </div>

        {/* User translation */}
        {exercise.user_translation && (
          <div className="mb-6">
            <p className="text-sm text-[var(--color-text-secondary)] mb-1">Ваш перевод:</p>
            <div className="p-3 bg-gray-50 rounded-xl text-sm">{exercise.user_translation}</div>
          </div>
        )}

        {exercise.dont_know && (
          <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-xl">
            <div className="flex items-center gap-2 text-sm text-red-700">
              <AlertCircle size={16} />
              <span>Вы нажали «Не знаю»</span>
            </div>
          </div>
        )}

        {/* Suggestions */}
        {exercise.suggestions.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">
              💡 Новые слова из предложения
            </h3>
            <div className="space-y-2">
              {exercise.suggestions.map(s => {
                const word = words.find(w => w.id === s.word_id);
                if (!word) return null;
                return (
                  <div key={s.word_id} className="flex items-center justify-between p-3 bg-white border border-[var(--color-border)] rounded-xl">
                    <div>
                      <span className="font-medium">{word.lemma}</span>
                      <span className="text-xs text-[var(--color-text-secondary)] ml-2">{word.pos}</span>
                      <div className="text-sm text-[var(--color-text-secondary)]">{word.translations.join(', ')}</div>
                    </div>
                    {s.state === 'suggested' && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => addSuggestion(exercise.id, s.word_id)}
                          className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                          title="Добавить"
                        >
                          <Plus size={16} />
                        </button>
                        <button
                          onClick={() => ignoreSuggestion(exercise.id, s.word_id)}
                          className="p-2 rounded-lg bg-gray-50 text-gray-400 hover:bg-gray-100 transition-colors"
                          title="Не предлагать"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}
                    {s.state === 'added' && (
                      <span className="text-green-600 flex items-center gap-1 text-xs">
                        <Check size={14} /> Добавлено
                      </span>
                    )}
                    {s.state === 'ignored' && (
                      <span className="text-gray-400 text-xs">Пропущено</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Next button */}
      <div className="px-4 pb-6">
        <button
          onClick={handleNext}
          className="w-full py-4 bg-[var(--color-primary)] text-white font-semibold rounded-xl hover:bg-[var(--color-primary-dark)] transition-all"
        >
          {isLast ? 'Завершить урок' : 'Далее'} →
        </button>
      </div>
    </div>
  );
}
