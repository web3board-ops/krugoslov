import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Flame, Target, Award, BookOpen, Settings, ChevronRight } from 'lucide-react';

export function ProfilePage() {
  const navigate = useNavigate();
  const { getProfileStats, user } = useStore();
  const stats = getProfileStats();

  if (!user) return null;

  // Generate heatmap data for last 12 months
  const generateHeatmap = () => {
    const cells = [];
    const today = new Date();
    const startDate = new Date(today);
    startDate.setMonth(startDate.getMonth() - 12);
    
    const dateMap = new Map(stats.heatmap.map(h => [h.date, h.count]));
    
    for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
      const dateStr = new Intl.DateTimeFormat('en-CA').format(d);
      cells.push({
        date: dateStr,
        count: dateMap.get(dateStr) || 0,
      });
    }
    return cells;
  };

  const heatmap = generateHeatmap();

  const getHeatmapColor = (count: number) => {
    if (count === 0) return 'bg-gray-100';
    if (count === 1) return 'bg-indigo-200';
    if (count === 2) return 'bg-indigo-400';
    return 'bg-indigo-600';
  };

  return (
    <div className="px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Профиль</h1>
        <button
          onClick={() => navigate('/settings')}
          className="p-2 rounded-full hover:bg-gray-100"
        >
          <Settings size={20} className="text-[var(--color-text-secondary)]" />
        </button>
      </div>

      {/* Streak */}
      <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-100 rounded-2xl p-4 mb-4">
        <div className="flex items-center gap-3">
          <Flame size={32} className={stats.streak_current > 0 ? 'text-orange-500' : 'text-gray-400'} />
          <div>
            <div className="text-2xl font-bold">{stats.streak_current} {stats.streak_current === 1 ? 'день' : 'дней'}</div>
            <div className="text-xs text-[var(--color-text-secondary)]">Текущая серия</div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-xs text-[var(--color-text-secondary)]">Рекорд</div>
            <div className="text-lg font-bold">{stats.streak_longest}</div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-4">
          <div className="flex items-center gap-2 mb-1">
            <Target size={16} className="text-green-500" />
            <span className="text-xs text-[var(--color-text-secondary)]">Точность (30 дн.)</span>
          </div>
          <div className="text-2xl font-bold">{stats.accuracy_30d}%</div>
        </div>
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-4">
          <div className="flex items-center gap-2 mb-1">
            <Award size={16} className="text-blue-500" />
            <span className="text-xs text-[var(--color-text-secondary)]">Точность (всё)</span>
          </div>
          <div className="text-2xl font-bold">{stats.accuracy_all}%</div>
        </div>
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-4">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen size={16} className="text-purple-500" />
            <span className="text-xs text-[var(--color-text-secondary)]">Уроков</span>
          </div>
          <div className="text-2xl font-bold">{stats.lessons_completed}</div>
        </div>
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-4">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen size={16} className="text-indigo-500" />
            <span className="text-xs text-[var(--color-text-secondary)]">Слов изучаю</span>
          </div>
          <div className="text-2xl font-bold">{stats.words_active}</div>
        </div>
      </div>

      {/* Words breakdown */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-4 mb-4">
        <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-3">Слова</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm">
              <span className="w-3 h-3 rounded-full bg-blue-500" /> Изучаю
            </span>
            <span className="font-medium">{stats.words_active}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm">
              <span className="w-3 h-3 rounded-full bg-green-500" /> Выучено
            </span>
            <span className="font-medium">{stats.words_mastered}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm">
              <span className="w-3 h-3 rounded-full bg-gray-400" /> Пропущено
            </span>
            <span className="font-medium">{stats.words_ignored}</span>
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-4 mb-4">
        <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-3">Активность (12 месяцев)</h3>
        <div className="flex gap-0.5 flex-wrap">
          {heatmap.map((cell, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-sm ${getHeatmapColor(cell.count)}`}
              title={`${cell.date}: ${cell.count} уроков`}
            />
          ))}
        </div>
        <div className="flex items-center gap-1 mt-2 text-xs text-[var(--color-text-secondary)]">
          <span>Меньше</span>
          <div className="w-3 h-3 rounded-sm bg-gray-100" />
          <div className="w-3 h-3 rounded-sm bg-indigo-200" />
          <div className="w-3 h-3 rounded-sm bg-indigo-400" />
          <div className="w-3 h-3 rounded-sm bg-indigo-600" />
          <span>Больше</span>
        </div>
      </div>

      {/* Settings link */}
      <button
        onClick={() => navigate('/settings/learning')}
        className="w-full bg-white rounded-xl border border-[var(--color-border)] p-4 flex items-center justify-between card-hover"
      >
        <span className="font-medium text-sm">Настройки обучения</span>
        <ChevronRight size={16} className="text-gray-400" />
      </button>
    </div>
  );
}
