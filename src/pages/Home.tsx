import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Flame, BookOpen, Target, Award, Settings, ChevronRight } from 'lucide-react';

export function HomePage() {
  const navigate = useNavigate();
  const { getDashboardSummary, user } = useStore();
  
  if (!user) return null;
  const summary = getDashboardSummary();

  const getCtaButton = () => {
    switch (summary.cta) {
      case 'resume':
        return {
          text: 'Продолжить урок',
          subtext: `Выполнено ${summary.resume!.exercises_done} из ${summary.resume!.exercises_total}`,
          onClick: () => navigate(`/lesson/resume/${summary.resume!.lesson_id}`),
          color: 'bg-amber-500 hover:bg-amber-600',
        };
      case 'limit_reached':
        return {
          text: 'Лимит исчерпан',
          subtext: `Возвращайтесь завтра`,
          onClick: () => {},
          color: 'bg-gray-400 cursor-not-allowed',
          disabled: true,
        };
      default:
        return {
          text: 'Начать урок',
          subtext: 'Новые слова ждут вас',
          onClick: () => navigate('/lesson/new'),
          color: 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)]',
        };
    }
  };

  const cta = getCtaButton();
  const streakAtRisk = summary.streak.current > 0 && !summary.streak.today_done;

  return (
    <div className="px-4 py-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Привет! 👋</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">Уровень {summary.level}</p>
        </div>
        <button
          onClick={() => navigate('/settings')}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <Settings size={20} className="text-[var(--color-text-secondary)]" />
        </button>
      </div>

      {/* Streak */}
      <div className={`rounded-2xl p-4 mb-4 ${streakAtRisk ? 'bg-amber-50 border border-amber-200' : 'bg-gradient-to-r from-orange-50 to-red-50 border border-orange-100'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            summary.streak.current > 0 ? 'bg-orange-100' : 'bg-gray-100'
          }`}>
            <Flame size={24} className={summary.streak.current > 0 ? 'text-orange-500' : 'text-gray-400'} />
          </div>
          <div className="flex-1">
            <div className="text-2xl font-bold">{summary.streak.current} {getDaysWord(summary.streak.current)}</div>
            <div className="text-xs text-[var(--color-text-secondary)]">
              {streakAtRisk ? 'Позанимайтесь сегодня, чтобы сохранить!' : 
               summary.streak.current > 0 ? 'Серия продолжается!' : 'Начните свою серию сегодня'}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-[var(--color-text-secondary)]">Рекорд</div>
            <div className="text-sm font-semibold">{summary.streak.longest}</div>
          </div>
        </div>
      </div>

      {/* Today's progress */}
      <div className="bg-white rounded-2xl border border-[var(--color-border)] p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-[var(--color-text-secondary)]">Сегодня</span>
          <span className="text-sm font-bold">{summary.lessons_today} / {summary.daily_lesson_limit} уроков</span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--color-primary)] rounded-full progress-bar"
            style={{ width: `${Math.min(100, (summary.lessons_today / summary.daily_lesson_limit) * 100)}%` }}
          />
        </div>
      </div>

      {/* Words summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-3 text-center">
          <div className="flex items-center justify-center mb-1">
            <BookOpen size={16} className="text-blue-500" />
          </div>
          <div className="text-lg font-bold">{summary.words.active}</div>
          <div className="text-xs text-[var(--color-text-secondary)]">Изучаю</div>
        </div>
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-3 text-center">
          <div className="flex items-center justify-center mb-1">
            <Award size={16} className="text-green-500" />
          </div>
          <div className="text-lg font-bold">{summary.words.mastered}</div>
          <div className="text-xs text-[var(--color-text-secondary)]">Выучено</div>
        </div>
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-3 text-center">
          <div className="flex items-center justify-center mb-1">
            <Target size={16} className="text-gray-400" />
          </div>
          <div className="text-lg font-bold">{summary.words.ignored}</div>
          <div className="text-xs text-[var(--color-text-secondary)]">Пропущено</div>
        </div>
      </div>

      {/* CTA Button */}
      <button
        onClick={cta.onClick}
        disabled={'disabled' in cta && cta.disabled}
        className={`w-full py-4 ${cta.color} text-white font-semibold rounded-2xl transition-all shadow-lg shadow-indigo-200/50 flex items-center justify-center gap-2 ${
          !('disabled' in cta && cta.disabled) ? 'active:scale-[0.98]' : ''
        }`}
      >
        {cta.text}
        <ChevronRight size={20} />
      </button>
      {cta.subtext && (
        <p className="text-center text-xs text-[var(--color-text-secondary)] mt-2">{cta.subtext}</p>
      )}

      {/* Limit reached info */}
      {summary.cta === 'limit_reached' && (
        <div className="mt-4 p-3 bg-gray-50 rounded-xl text-center">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Лимит можно изменить в{' '}
            <button onClick={() => navigate('/settings/learning')} className="text-[var(--color-primary)] underline">
              настройках обучения
            </button>
          </p>
        </div>
      )}
    </div>
  );
}

function getDaysWord(n: number): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return 'дней';
  if (last === 1) return 'день';
  if (last >= 2 && last <= 4) return 'дня';
  return 'дней';
}
