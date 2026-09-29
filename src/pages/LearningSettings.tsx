import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { GraduationCap, BookOpen, Hash } from 'lucide-react';
import { Level } from '../types';

export function LearningSettingsPage() {
  const navigate = useNavigate();
  const { profile, dictionaries, updateProfile } = useStore();
  
  const [level, setLevel] = useState<Level>(profile?.level || 'A1');
  const [dictionaryId, setDictionaryId] = useState(profile?.dictionary_id || 1);
  const [dailyLimit, setDailyLimit] = useState(profile?.daily_lesson_limit || 3);
  const [saved, setSaved] = useState(false);

  if (!profile) return null;

  const MAX_LIMIT = 5;

  const handleSave = () => {
    updateProfile({ level, dictionary_id: dictionaryId, daily_lesson_limit: dailyLimit });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="px-4 py-6 max-w-[640px] mx-auto">
      <button onClick={() => navigate('/settings')} className="text-sm text-[var(--color-text-secondary)] mb-4">
        ← Назад
      </button>
      <h1 className="text-xl font-bold mb-6">Настройки обучения</h1>

      {/* Level */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-4 mb-4">
        <div className="flex items-center gap-3 mb-3">
          <GraduationCap size={18} className="text-[var(--color-primary)]" />
          <span className="font-medium text-sm">Уровень</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {(['A1', 'A2', 'B1', 'B2'] as Level[]).map(l => (
            <button
              key={l}
              onClick={() => setLevel(l)}
              className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                level === l
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-gray-100 text-[var(--color-text-secondary)] hover:bg-gray-200'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Dictionary */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-4 mb-4">
        <div className="flex items-center gap-3 mb-3">
          <BookOpen size={18} className="text-[var(--color-primary)]" />
          <span className="font-medium text-sm">Словарь</span>
        </div>
        <div className="space-y-2">
          {dictionaries.map(dict => (
            <button
              key={dict.id}
              onClick={() => setDictionaryId(dict.id)}
              className={`w-full text-left p-3 rounded-xl border transition-all ${
                dictionaryId === dict.id
                  ? 'border-[var(--color-primary)] bg-indigo-50'
                  : 'border-[var(--color-border)] hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{dict.name}</span>
                <span className="text-xs text-[var(--color-text-secondary)]">{dict.word_ids.length} слов</span>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{dict.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Daily limit */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-4 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <Hash size={18} className="text-[var(--color-primary)]" />
          <span className="font-medium text-sm">Уроков в день</span>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={1}
            max={MAX_LIMIT}
            value={dailyLimit}
            onChange={e => setDailyLimit(Number(e.target.value))}
            className="flex-1 accent-[var(--color-primary)]"
          />
          <span className="text-lg font-bold w-8 text-center">{dailyLimit}</span>
        </div>
        <p className="text-xs text-[var(--color-text-secondary)] mt-1">
          Максимум: {MAX_LIMIT} уроков в день
        </p>
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        className={`w-full py-3 font-medium rounded-xl transition-all ${
          saved
            ? 'bg-green-500 text-white'
            : 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)]'
        }`}
      >
        {saved ? '✓ Сохранено' : 'Сохранить'}
      </button>

      {/* Info */}
      <div className="mt-4 p-3 bg-gray-50 rounded-xl">
        <p className="text-xs text-[var(--color-text-secondary)]">
          💡 Изменения не затрагивают текущий незавершённый урок. Смена словаря не удаляет уже изучаемые слова.
        </p>
      </div>
    </div>
  );
}
