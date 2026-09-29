import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Search } from 'lucide-react';

export function VocabularyPage() {
  const navigate = useNavigate();
  const { getUserVocabulary, changeWordStatus } = useStore();
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [words, setWords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWords();
  }, [activeTab, query]);

  const loadWords = async () => {
    setLoading(true);
    try {
      const data = await getUserVocabulary(activeTab || undefined, query || undefined);
      setWords(data.words || []);
    } catch (error) {
      console.error('Failed to load words:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeStatus = async (wordId: number, status: string) => {
    await changeWordStatus(wordId, status);
    loadWords();
  };

  const tabs = [
    { value: null, label: 'Все' },
    { value: 'active', label: 'Изучаю' },
    { value: 'mastered', label: 'Выучено' },
    { value: 'ignored', label: 'Пропущено' },
  ];

  return (
    <div className="px-4 py-6">
      <h1 className="text-xl font-bold mb-4">Мой словарь</h1>
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Поиск..."
          className="w-full pl-9 pr-4 py-2.5 border border-[var(--color-border)] rounded-xl text-sm"
        />
      </div>
      <div className="flex gap-1 mb-4">
        {tabs.map(tab => (
          <button
            key={tab.value || 'all'}
            onClick={() => setActiveTab(tab.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              activeTab === tab.value ? 'bg-[var(--color-primary)] text-white' : 'bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="flex justify-center py-8"><div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" /></div>
      ) : words.length === 0 ? (
        <div className="text-center py-12 text-[var(--color-text-secondary)]">Словарь пуст</div>
      ) : (
        <div className="space-y-2">
          {words.map((word: any) => (
            <div key={word.id} onClick={() => navigate(`/vocabulary/${word.id}`)} className="bg-white rounded-xl border border-[var(--color-border)] p-3 cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">{word.lemma}</span>
                  <p className="text-sm text-[var(--color-text-secondary)]">{word.translations?.join(', ')}</p>
                </div>
                {word.status === 'active' && (
                  <button onClick={(e) => { e.stopPropagation(); handleChangeStatus(word.id, 'ignored'); }} className="text-xs text-gray-400">×</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
