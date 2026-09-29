import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Ban, RotateCcw, Clock } from 'lucide-react';

export function WordCardPage() {
  const { wordId } = useParams();
  const navigate = useNavigate();
  const { getWordDetails, changeWordStatus } = useStore();

  const word = wordId ? getWordDetails(Number(wordId)) : null;

  if (!word) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-[var(--color-text-secondary)] mb-4">Слово не найдено</p>
          <button onClick={() => navigate('/vocabulary')} className="px-6 py-3 bg-[var(--color-primary)] text-white rounded-xl">
            К словарю
          </button>
        </div>
      </div>
    );
  }

  const getProgressColor = (stage: number) => {
    if (stage >= 5) return 'bg-green-500';
    if (stage >= 3) return 'bg-blue-500';
    return 'bg-amber-500';
  };

  const getResultBadge = (result: string | null) => {
    switch (result) {
      case 'correct': return '🟢';
      case 'typo': return '🟠';
      case 'incorrect': return '🔴';
      default: return '⚪';
    }
  };

  return (
    <div className="min-h-screen max-w-[640px] mx-auto px-4 py-6">
      <button onClick={() => navigate('/vocabulary')} className="text-sm text-[var(--color-text-secondary)] mb-4">
        ← К словарю
      </button>

      {/* Word header */}
      <div className="bg-white rounded-2xl border border-[var(--color-border)] p-6 mb-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{word.lemma}</h1>
            <span className="text-sm text-[var(--color-text-secondary)]">{word.pos}</span>
          </div>
          <span className={`px-2 py-1 text-xs rounded-lg border ${
            word.status === 'active' ? 'bg-blue-50 text-blue-700 border-blue-200' :
            word.status === 'mastered' ? 'bg-green-50 text-green-700 border-green-200' :
            'bg-gray-50 text-gray-500 border-gray-200'
          }`}>
            {word.status === 'active' ? 'Изучаю' : word.status === 'mastered' ? 'Выучено' : 'Пропущено'}
          </span>
        </div>
        
        <div className="mt-4">
          <p className="text-lg text-[var(--color-text)]">{word.translations.join(', ')}</p>
        </div>

        {/* Stage progress */}
        {word.status === 'active' && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-[var(--color-text-secondary)]">Прогресс</span>
              <span className="text-xs font-medium">{word.stage} / 6</span>
            </div>
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4, 5, 6].map(i => (
                <div
                  key={i}
                  className={`flex-1 h-2 rounded-full ${
                    i < word.stage ? getProgressColor(word.stage) : 'bg-gray-100'
                  }`}
                />
              ))}
            </div>
            {word.due && (
              <div className="flex items-center gap-1 mt-2 text-xs text-[var(--color-text-secondary)]">
                <Clock size={12} />
                <span>Повтор через {word.due} уроков</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 mb-6">
        {word.status === 'active' && (
          <button
            onClick={() => changeWordStatus(word.id, 'ignored')}
            className="flex-1 py-2.5 border border-[var(--color-border)] rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:bg-gray-50"
          >
            <Ban size={14} /> Не изучать
          </button>
        )}
        {(word.status === 'ignored' || word.status === 'mastered') && (
          <button
            onClick={() => changeWordStatus(word.id, 'active')}
            className="flex-1 py-2.5 bg-[var(--color-primary)] text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2"
          >
            <RotateCcw size={14} /> Вернуть в изучение
          </button>
        )}
      </div>

      {/* History */}
      {word.history.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-3">История контекстов</h3>
          <div className="space-y-2">
            {word.history.slice(0, 20).map((h, i) => (
              <div key={i} className="bg-white rounded-xl border border-[var(--color-border)] p-3">
                <div className="flex items-start justify-between">
                  <p className="text-sm flex-1">{h.sentence}</p>
                  <span className="ml-2">{getResultBadge(h.result)}</span>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">{h.translation}</p>
                {h.date && (
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(h.date).toLocaleDateString('ru-RU')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {word.history.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Пока нет истории. Слово появится здесь после первого урока.
          </p>
        </div>
      )}
    </div>
  );
}
