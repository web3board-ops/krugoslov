import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Flag } from 'lucide-react';

export function ExercisePage() {
  const { lessonId, exerciseId } = useParams();
  const navigate = useNavigate();
  const { lessons, evaluateExercise } = useStore();
  const [translation, setTranslation] = useState('');
  const [loading, setLoading] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const lesson = lessons.find(l => l.id === Number(lessonId));
  const exercise = lesson?.exercises.find(e => e.id === Number(exerciseId));

  // If exercise already evaluated, redirect to review
  useEffect(() => {
    if (exercise && exercise.status === 'evaluated') {
      navigate(`/lesson/${lessonId}/review/${exerciseId}`, { replace: true });
    }
  }, [exercise, lessonId, exerciseId, navigate]);

  // Load draft from localStorage
  useEffect(() => {
    if (exerciseId) {
      const draft = localStorage.getItem(`draft_${exerciseId}`);
      if (draft) setTranslation(draft);
    }
  }, [exerciseId]);

  // Save draft
  useEffect(() => {
    if (exerciseId) {
      localStorage.setItem(`draft_${exerciseId}`, translation);
    }
  }, [translation, exerciseId]);

  // Intercept back navigation
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      setShowExitModal(true);
      window.history.pushState(null, '', window.location.href);
    };
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);
    
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Выйти из урока? Прогресс сохранится.';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  if (!lesson || !exercise) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--color-text-secondary)]">Упражнение не найдено</p>
      </div>
    );
  }

  const exerciseIndex = lesson.exercises.findIndex(e => e.id === exercise.id);
  const totalExercises = lesson.exercises.length;
  const progress = ((exerciseIndex + 1) / totalExercises) * 100;

  const handleSubmit = () => {
    if (!translation.trim()) return;
    setLoading(true);
    
    // Simulate LLM evaluation delay
    setTimeout(() => {
      const result = evaluateExercise(exercise.id, translation.trim(), false);
      localStorage.removeItem(`draft_${exerciseId}`);
      setLoading(false);
      
      if (result) {
        navigate(`/lesson/${lessonId}/review/${exerciseId}`);
      }
    }, 1200);
  };

  const handleDontKnow = () => {
    setLoading(true);
    setTimeout(() => {
      const result = evaluateExercise(exercise.id, null, true);
      localStorage.removeItem(`draft_${exerciseId}`);
      setLoading(false);
      
      if (result) {
        navigate(`/lesson/${lessonId}/review/${exerciseId}`);
      }
    }, 500);
  };

  // Highlight target words in sentence
  const renderSentence = () => {
    let sentence = exercise.target_sentence;
    const targetWords = exercise.words.filter(w => w.is_target);
    
    // Simple highlighting - wrap target words in spans
    targetWords.forEach(w => {
      if (w.surface_form) {
        const regex = new RegExp(`\\b(${w.surface_form})\\b`, 'gi');
        sentence = sentence.replace(regex, `<mark class="bg-indigo-100 text-indigo-800 px-0.5 rounded font-medium">$1</mark>`);
      }
    });
    
    return <span dangerouslySetInnerHTML={{ __html: sentence }} />;
  };

  return (
    <div className="min-h-screen flex flex-col max-w-[640px] mx-auto bg-white">
      {/* Progress bar */}
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-[var(--color-text-secondary)]">
            Упражнение {exerciseIndex + 1} из {totalExercises}
          </span>
          <button
            onClick={() => setShowReportModal(true)}
            className="text-xs text-[var(--color-text-secondary)] flex items-center gap-1 hover:text-[var(--color-danger)]"
          >
            <Flag size={12} /> Пожаловаться
          </button>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-[var(--color-primary)] rounded-full progress-bar" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Exercise content */}
      <div className="flex-1 flex flex-col px-4 py-8">
        <div className="flex-1 flex flex-col justify-center">
          <p className="text-sm text-[var(--color-text-secondary)] mb-3">Переведите на русский:</p>
          <div className="text-xl font-medium leading-relaxed mb-8 p-4 bg-gray-50 rounded-xl">
            {renderSentence()}
          </div>

          <textarea
            value={translation}
            onChange={e => setTranslation(e.target.value)}
            placeholder="Введите перевод на русский..."
            className="w-full min-h-[120px] p-4 border border-[var(--color-border)] rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-base"
            maxLength={500}
            disabled={loading}
          />
          <div className="text-right text-xs text-[var(--color-text-secondary)] mt-1">
            {translation.length}/500
          </div>
        </div>

        {/* Buttons */}
        <div className="space-y-3 pb-6">
          <button
            onClick={handleSubmit}
            disabled={!translation.trim() || loading}
            className="w-full py-4 bg-[var(--color-primary)] text-white font-semibold rounded-xl hover:bg-[var(--color-primary-dark)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Проверить'
            )}
          </button>
          <button
            onClick={handleDontKnow}
            disabled={loading}
            className="w-full py-3 border border-[var(--color-border)] text-[var(--color-text-secondary)] font-medium rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Не знаю
          </button>
        </div>
      </div>

      {/* Exit modal */}
      {showExitModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full animate-slide-up">
            <h3 className="text-lg font-bold mb-2">Выйти из урока?</h3>
            <p className="text-[var(--color-text-secondary)] text-sm mb-6">
              Прогресс сохранится. Вы сможете продолжить позже.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowExitModal(false); navigate('/'); }}
                className="flex-1 py-3 border border-[var(--color-border)] rounded-xl font-medium hover:bg-gray-50"
              >
                Выйти
              </button>
              <button
                onClick={() => setShowExitModal(false)}
                className="flex-1 py-3 bg-[var(--color-primary)] text-white rounded-xl font-medium"
              >
                Остаться
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full animate-slide-up">
            <h3 className="text-lg font-bold mb-4">Пожаловаться на предложение</h3>
            <div className="space-y-2 mb-6">
              {['Неправильное предложение', 'Неверный перевод', 'Грамматическая ошибка', 'Другое'].map(reason => (
                <button
                  key={reason}
                  onClick={() => { setShowReportModal(false); }}
                  className="w-full text-left px-4 py-3 border border-[var(--color-border)] rounded-xl hover:bg-gray-50 text-sm"
                >
                  {reason}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowReportModal(false)}
              className="w-full py-3 border border-[var(--color-border)] rounded-xl font-medium"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
