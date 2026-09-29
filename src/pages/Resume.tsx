import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Play, RotateCcw } from 'lucide-react';

export function ResumePage() {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const { lessons, abandonLesson } = useStore();
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const lesson = lessons.find(l => l.id === Number(lessonId));

  if (!lesson || lesson.status !== 'in_progress') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-[var(--color-text-secondary)] mb-4">Урок не найден или уже завершён</p>
          <button onClick={() => navigate('/')} className="px-6 py-3 bg-[var(--color-primary)] text-white rounded-xl">
            На главную
          </button>
        </div>
      </div>
    );
  }

  const exercisesDone = lesson.exercises.filter(e => e.status === 'evaluated').length;
  const exercisesTotal = lesson.exercises.length;
  const progress = (exercisesDone / exercisesTotal) * 100;

  // Find next pending exercise
  const nextExercise = lesson.exercises.find(e => e.status === 'pending');

  const handleContinue = () => {
    if (nextExercise) {
      navigate(`/lesson/${lessonId}/exercise/${nextExercise.id}`);
    }
  };

  const handleRestart = () => {
    abandonLesson(lesson.id);
    navigate('/lesson/new');
  };

  return (
    <div className="min-h-screen flex flex-col max-w-[640px] mx-auto px-4 py-8">
      <button onClick={() => navigate('/')} className="text-sm text-[var(--color-text-secondary)] mb-6">
        ← На главную
      </button>

      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Play className="text-amber-600" size={28} />
        </div>
        <h1 className="text-2xl font-bold">Незавершённый урок</h1>
        <p className="text-[var(--color-text-secondary)] mt-1">Урок №{lesson.lesson_number}</p>
      </div>

      {/* Progress */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-[var(--color-text-secondary)]">Прогресс</span>
          <span className="text-sm font-medium">{exercisesDone} / {exercisesTotal}</span>
        </div>
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-[var(--color-primary)] rounded-full progress-bar" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3 mt-auto">
        <button
          onClick={handleContinue}
          className="w-full py-4 bg-[var(--color-primary)] text-white font-semibold rounded-xl hover:bg-[var(--color-primary-dark)] transition-all flex items-center justify-center gap-2"
        >
          <Play size={18} /> Продолжить
        </button>
        <button
          onClick={() => setShowConfirmModal(true)}
          className="w-full py-3 border border-[var(--color-border)] text-[var(--color-text-secondary)] font-medium rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
        >
          <RotateCcw size={16} /> Начать заново
        </button>
      </div>

      {/* Confirm modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full animate-slide-up">
            <h3 className="text-lg font-bold mb-2">Начать заново?</h3>
            <p className="text-[var(--color-text-secondary)] text-sm mb-2">
              Текущий урок будет закрыт.
            </p>
            <p className="text-red-600 text-sm font-medium mb-6">
              ⚠️ Лимит уроков на сегодня уже израсходован и не вернётся. Слова, которые вы уже проверили, сохранят результат.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 border border-[var(--color-border)] rounded-xl font-medium hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                onClick={handleRestart}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600"
              >
                Начать заново
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
