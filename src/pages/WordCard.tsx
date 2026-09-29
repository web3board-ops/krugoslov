import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store';

export function WordCardPage() {
  const { wordId } = useParams();
  const navigate = useNavigate();
  const { getWordDetails, changeWordStatus } = useStore();
  const [word, setWord] = useState<any>(null);

  useEffect(() => {
    loadWord();
  }, [wordId]);

  const loadWord = async () => {
    try {
      const data = await getWordDetails(Number(wordId));
      setWord(data);
    } catch (error) {
      console.error('Failed to load word:', error);
    }
  };

  if (!word) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="min-h-screen max-w-[640px] mx-auto px-4 py-6">
      <button onClick={() => navigate('/vocabulary')} className="text-sm text-[var(--color-text-secondary)] mb-4">← К словарю</button>
      <div className="bg-white rounded-2xl border border-[var(--color-border)] p-6 mb-4">
        <h1 className="text-3xl font-bold">{word.lemma}</h1>
        <span className="text-sm text-[var(--color-text-secondary)]">{word.pos}</span>
        <p className="text-lg mt-4">{word.translations?.join(', ')}</p>
        <div className="mt-4 text-sm text-[var(--color-text-secondary)]">Статус: {word.status}, Стадия: {word.stage}/6</div>
      </div>
      <div className="flex gap-2 mb-6">
        {word.status === 'active' && (
          <button onClick={() => changeWordStatus(word.id, 'ignored').then(loadWord)} className="flex-1 py-2.5 border border-[var(--color-border)] rounded-xl text-sm">Не изучать</button>
        )}
        {(word.status === 'ignored' || word.status === 'mastered') && (
          <button onClick={() => changeWordStatus(word.id, 'active').then(loadWord)} className="flex-1 py-2.5 bg-[var(--color-primary)] text-white rounded-xl text-sm">Вернуть в изучение</button>
        )}
      </div>
      {word.history?.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-3">История</h3>
          <div className="space-y-2">
            {word.history.map((h: any, i: number) => (
              <div key={i} className="bg-white rounded-xl border border-[var(--color-border)] p-3">
                <p className="text-sm">{h.sentence}</p>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">{h.translation}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
