import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';

export function LearningSettingsPage() {
  const navigate = useNavigate();
  const { profile, updateProfile, getDictionaries, getLearningProfile } = useStore();
  const [level, setLevel] = useState(profile?.level || 'A1');
  const [dictionaryId, setDictionaryId] = useState(profile?.dictionary_id || 1);
  const [dailyLimit, setDailyLimit] = useState(profile?.daily_lesson_limit || 3);
  const [dictionaries, setDictionaries] = useState<any[]>([]);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Загружаем актуальные данные из API
      const [profileData, dictionariesData] = await Promise.all([
        getLearningProfile(),
        getDictionaries()
      ]);
      
      if (profileData) {
        setLevel(profileData.level);
        setDictionaryId(profileData.dictionary_id);
        setDailyLimit(profileData.daily_lesson_limit);
      }
      
      if (dictionariesData) {
        setDictionaries(dictionariesData);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await updateProfile({ level, dictionary_id: dictionaryId, daily_lesson_limit: dailyLimit });
      
      // Перезагружаем данные профиля для отображения изменений
      const profileData = await getLearningProfile();
      if (profileData) {
        setLevel(profileData.level);
        setDictionaryId(profileData.dictionary_id);
        setDailyLimit(profileData.daily_lesson_limit);
      }
      
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save profile:', error);
      alert('Ошибка при сохранении настроек');
    }
  };

  if (loading) {
    return (
      <div className="px-4 py-6 max-w-[640px] mx-auto">
        <button onClick={() => navigate('/settings')} className="text-sm text-[var(--color-text-secondary)] mb-4">← Назад</button>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-[640px] mx-auto">
      <button onClick={() => navigate('/settings')} className="text-sm text-[var(--color-text-secondary)] mb-4">← Назад</button>
      <h1 className="text-xl font-bold mb-6">Настройки обучения</h1>
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-4 mb-4">
        <span className="font-medium text-sm block mb-3">Уровень</span>
        <div className="grid grid-cols-4 gap-2">
          {(['A1', 'A2', 'B1', 'B2'] as const).map(l => (
            <button key={l} onClick={() => setLevel(l)} className={`py-2 rounded-lg text-sm font-medium ${level === l ? 'bg-[var(--color-primary)] text-white' : 'bg-gray-100'}`}>{l}</button>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-4 mb-4">
        <span className="font-medium text-sm block mb-3">Словарь</span>
        <div className="space-y-2">
          {dictionaries.map((dict: any) => (
            <button key={dict.id} onClick={() => setDictionaryId(dict.id)} className={`w-full text-left p-3 rounded-xl border ${dictionaryId === dict.id ? 'border-[var(--color-primary)] bg-indigo-50' : 'border-[var(--color-border)]'}`}>
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{dict.name}</span>
                <span className="text-xs text-[var(--color-text-secondary)]">{dict.words_total} слов</span>
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-4 mb-6">
        <span className="font-medium text-sm block mb-3">Уроков в день</span>
        <div className="flex items-center gap-3">
          <input type="range" min={1} max={5} value={dailyLimit} onChange={e => setDailyLimit(Number(e.target.value))} className="flex-1" />
          <span className="text-lg font-bold w-8 text-center">{dailyLimit}</span>
        </div>
      </div>
      <button onClick={handleSave} className={`w-full py-3 font-medium rounded-xl ${saved ? 'bg-green-500 text-white' : 'bg-[var(--color-primary)] text-white'}`}>
        {saved ? '✓ Сохранено' : 'Сохранить'}
      </button>
    </div>
  );
}
