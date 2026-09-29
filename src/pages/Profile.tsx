import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Flame } from 'lucide-react';

export function ProfilePage() {
  const navigate = useNavigate();
  const { getProfileStats } = useStore();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await getProfileStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  if (!stats) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="px-4 py-6">
      <h1 className="text-xl font-bold mb-6">Профиль</h1>
      <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-100 rounded-2xl p-4 mb-4">
        <div className="flex items-center gap-3">
          <Flame size={32} className={stats.streak_current > 0 ? 'text-orange-500' : 'text-gray-400'} />
          <div>
            <div className="text-2xl font-bold">{stats.streak_current} дней</div>
            <div className="text-xs text-[var(--color-text-secondary)]">Текущая серия</div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-xs text-[var(--color-text-secondary)]">Рекорд</div>
            <div className="text-lg font-bold">{stats.streak_longest}</div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-4">
          <div className="text-2xl font-bold">{stats.accuracy_all}%</div>
          <div className="text-xs text-[var(--color-text-secondary)]">Точность</div>
        </div>
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-4">
          <div className="text-2xl font-bold">{stats.lessons_completed}</div>
          <div className="text-xs text-[var(--color-text-secondary)]">Уроков</div>
        </div>
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-4">
          <div className="text-2xl font-bold">{stats.words_active}</div>
          <div className="text-xs text-[var(--color-text-secondary)]">Изучаю</div>
        </div>
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-4">
          <div className="text-2xl font-bold">{stats.words_mastered}</div>
          <div className="text-xs text-[var(--color-text-secondary)]">Выучено</div>
        </div>
      </div>
      <button onClick={() => navigate('/settings/learning')} className="w-full bg-white rounded-xl border border-[var(--color-border)] p-4 text-sm font-medium">
        Настройки обучения →
      </button>
    </div>
  );
}
