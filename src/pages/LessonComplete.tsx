import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Flame, Target, Award, BookOpen, Plus } from 'lucide-react';
import confetti from 'canvas-confetti';

export function LessonCompletePage() {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const { getLessonSummary } = useStore();
  const confettiFired = useRef(false);

  const summary = lessonId ? getLessonSummary(Number(lessonId)) : null;

  useEffect(() => {
    if (summary?.streak.extended_today && !confettiFired.current) {
      confettiFired.current = true;
      // Fire confetti
      const duration = 2000;
      const end = Date.now() + duration;
      
      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#6366f1', '#22c55e', '#f59e0b'],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#6366f1', '#22c55e', '#f59e0b'],
        });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    }
  }, [summary]);

  if (!summary) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--color-text-secondary)]">Итоги не найдены</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col max-w-[640px] mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8 animate-slide-up">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl">🎉</span>
        </div>
        <h1 className="text-2xl font-bold">Урок завершён!</h1>
        <p className="text-[var(--color-text-secondary)] mt-1">Урок №{summary.lesson_number}</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-6 animate-slide-up">
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-4 text-center">
          <BookOpen size={20} className="text-blue-500 mx-auto mb-1" />
          <div className="text-2xl font-bold">{summary.words_total}</div>
          <div className="text-xs text-[var(--color-text-secondary)]">Всего слов</div>
        </div>
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-4 text-center">
          <Target size={20} className="text-purple-500 mx-auto mb-1" />
          <div className="text-2xl font-bold">{summary.reviewed}</div>
          <div className="text-xs text-[var(--color-text-secondary)]">Повторено</div>
        </div>
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-4 text-center">
          <Plus size={20} className="text-green-500 mx-auto mb-1" />
          <div className="text-2xl font-bold">{summary.new_words}</div>
          <div className="text-xs text-[var(--color-text-secondary)]">Новых</div>
        </div>
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-4 text-center">
          <Award size={20} className="text-amber-500 mx-auto mb-1" />
          <div className="text-2xl font-bold">{summary.without_errors}</div>
          <div className="text-xs text-[var(--color-text-secondary)]">Без ошибок</div>
        </div>
      </div>

      {/* Results breakdown */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-4 mb-6 animate-slide-up">
        <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-3">Результаты</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm">
              <span className="w-3 h-3 rounded-full bg-green-500" /> Верно
            </span>
            <span className="font-medium">{summary.correct}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm">
              <span className="w-3 h-3 rounded-full bg-amber-500" /> Опечатка
            </span>
            <span className="font-medium">{summary.typo}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm">
              <span className="w-3 h-3 rounded-full bg-red-500" /> Неверно
            </span>
            <span className="font-medium">{summary.incorrect}</span>
          </div>
        </div>
        {summary.suggestions_added > 0 && (
          <div className="mt-3 pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
            <span className="text-sm text-[var(--color-text-secondary)]">Добавлено подсказок</span>
            <span className="font-medium">{summary.suggestions_added}</span>
          </div>
        )}
      </div>

      {/* Streak */}
      <div className={`rounded-xl p-4 mb-8 animate-slide-up ${
        summary.streak.extended_today ? 'bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200' : 'bg-white border border-[var(--color-border)]'
      }`}>
        <div className="flex items-center gap-3">
          <Flame size={32} className={summary.streak.extended_today ? 'text-orange-500' : 'text-gray-400'} />
          <div>
            <div className="text-2xl font-bold">
              {summary.streak.current} {summary.streak.current === 1 ? 'день' : summary.streak.current < 5 ? 'дня' : 'дней'}
            </div>
            <div className="text-sm text-[var(--color-text-secondary)]">
              {summary.streak.extended_today ? '🔥 Серия продлена!' : 'Текущая серия'}
            </div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-xs text-[var(--color-text-secondary)]">Рекорд</div>
            <div className="text-lg font-bold">{summary.streak.longest}</div>
          </div>
        </div>
      </div>

      {/* Home button */}
      <button
        onClick={() => navigate('/')}
        className="w-full py-4 bg-[var(--color-primary)] text-white font-semibold rounded-xl hover:bg-[var(--color-primary-dark)] transition-all mt-auto"
      >
        На главную
      </button>
    </div>
  );
}
