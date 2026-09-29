import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Search, Ban, RotateCcw } from 'lucide-react';
import { WordStatus } from '../types';

export function VocabularyPage() {
  const navigate = useNavigate();
  const { getUserVocabulary, changeWordStatus } = useStore();
  const [activeTab, setActiveTab] = useState<WordStatus | null>(null);
  const [query, setQuery] = useState('');

  const { words, total } = getUserVocabulary(activeTab, query);

  const tabs: { value: WordStatus | null; label: string }[] = [
    { value: null, label: 'Все' },
    { value: 'active', label: 'Изучаю' },
    { value: 'mastered', label: 'Выучено' },
    { value: 'ignored', label: 'Пропущено' },
  ];

  const getProgressColor = (stage: number) => {
    if (stage >= 5) return 'bg-green-500';
    if (stage >= 3) return 'bg-blue-500';
    return 'bg-amber-500';
  };

  const getStatusBadge = (status: WordStatus) => {
    switch (status) {
      case 'active': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'mastered': return 'bg-green-50 text-green-700 border-green-200';
      case 'ignored': return 'bg-gray-50 text-gray-500 border-gray-200';
    }
  };

  const getStatusLabel = (status: WordStatus) => {
    switch (status) {
      case 'active': return 'Изучаю';
      case 'mastered': return 'Выучено';
      case 'ignored': return 'Пропущено';
    }
  };

  if (total === 0 && !query) {
    return (
      <div className="px-4 py-8">
        <h1 className="text-xl font-bold mb-6">Мой словарь</h1>
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="text-gray-400" size={24} />
          </div>
          <p className="text-[var(--color-text-secondary)]">
            Словарь пока пуст. Начните урок, чтобы добавить первые слова!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <h1 className="text-xl font-bold mb-4">Мой словарь</h1>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Поиск по слову или переводу..."
          className="w-full pl-9 pr-4 py-2.5 border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto no-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.value || 'all'}
            onClick={() => setActiveTab(tab.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.value
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-gray-100 text-[var(--color-text-secondary)] hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Words list */}
      <div className="space-y-2">
        {words.map(word => (
          <div
            key={word.id}
            onClick={() => navigate(`/vocabulary/${word.id}`)}
            className="bg-white rounded-xl border border-[var(--color-border)] p-3 card-hover cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{word.lemma}</span>
                  <span className="text-xs text-[var(--color-text-secondary)]">{word.pos}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded border ${getStatusBadge(word.status)}`}>
                    {getStatusLabel(word.status)}
                  </span>
                </div>
                <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
                  {word.translations.join(', ')}
                </p>
              </div>
              {word.status === 'active' && (
                <button
                  onClick={(e) => { e.stopPropagation(); changeWordStatus(word.id, 'ignored'); }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
                  title="Не изучать"
                >
                  <Ban size={14} />
                </button>
              )}
              {(word.status === 'ignored' || word.status === 'mastered') && (
                <button
                  onClick={(e) => { e.stopPropagation(); changeWordStatus(word.id, 'active'); }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
                  title="Вернуть в изучение"
                >
                  <RotateCcw size={14} />
                </button>
              )}
            </div>
            {/* Progress bar */}
            {word.status === 'active' && (
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${getProgressColor(word.stage)}`}
                      style={{ width: `${(word.stage / 6) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-[var(--color-text-secondary)]">{word.stage}/6</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {total === 0 && query && (
        <div className="text-center py-8">
          <p className="text-[var(--color-text-secondary)]">Ничего не найдено по запросу «{query}»</p>
        </div>
      )}
    </div>
  );
}
