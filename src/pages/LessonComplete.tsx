import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Flame } from 'lucide-react';
import confetti from 'canvas-confetti';

export function LessonCompletePage() {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const { getLessonSummary } = useStore();
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    loadSummary();
  }, [lessonId]);

  const loadSummary = async () => {
    try {
      const data = await getLessonSummary(Number(lessonId));
      setSummary(data);
      if (data?.streak?.extended_today) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }
    } catch (error) {
      console.error('Failed to load summary:', error);
    }
  };

  if (!summary) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="min-h-screen flex flex-col max-w-[640px] mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl">🎉</span>
        </div>
        <h1 className="text-2xl font-bold">Урок завершён!</h1>
        <p className="text-[var(--color-text-secondary)] mt-1">Урок №{summary.lesson_number}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-4 text-center">
          <div className="text-2xl font-bold">{summary.words_total}</div>
          <div className="text-xs text-[var(--color-text-secondary)]">Всего слов</div>
        </div>
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-4 text-center">
          <div className="text-2xl font-bold">{summary.reviewed}</div>
          <div className="text-xs text-[var(--color-text-secondary)]">Повторено</div>
        </div>
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-4 text-center">
          <div className="text-2xl font-bold">{summary.new_words}</div>
          <div className="text-xs text-[var(--color-text-secondary)]">Новых</div>
        </div>
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-4 text-center">
          <div className="text-2xl font-bold">{summary.without_errors}</div>
          <div className="text-xs text-[var(--color-text-secondary)]">Без ошибок</div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl p-4 mb-8">
        <div className="flex items-center gap-3">
          <Flame size={32} className="text-orange-500" />
          <div>
            <div className="text-2xl font-bold">{summary.streak.current} дней</div>
            <div className="text-sm text-[var(--color-text-secondary)]">
              {summary.streak.extended_today ? '🔥 Серия продлена!' : 'Текущая серия'}
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => navigate('/')}
        className="w-full py-4 bg-[var(--color-primary)] text-white font-semibold rounded-xl mt-auto"
      >
        На главную
      </button>
    </div>
  );
}
