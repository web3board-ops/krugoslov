import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { X, AlertTriangle } from 'lucide-react';

export function LessonIntroPage() {
  const navigate = useNavigate();
  const { previewLesson, declineNewWord, startLesson } = useStore();
  const [preview, setPreview] = useState(previewLesson());
  const [declinedWords, setDeclinedWords] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (preview.state === 'resume' && preview.lesson_id) {
      navigate(`/lesson/resume/${preview.lesson_id}`);
    }
    if (preview.state === 'limit_reached') {
      navigate('/');
    }
  }, [preview, navigate]);

  const handleDecline = (wordId: number) => {
    setDeclinedWords(prev => new Set(prev).add(wordId));
    const newPreview = declineNewWord(wordId);
    setPreview(newPreview);
  };

  const handleStart = () => {
    setLoading(true);
    // Simulate LLM generation delay
    setTimeout(() => {
      const allWordIds = [
        ...(preview.due_words || []).map(w => w.word_id),
        ...(preview.new_words || []).map(w => w.word_id),
      ];
      
      const lesson = startLesson(allWordIds);
      if (lesson) {
        navigate(`/lesson/${lesson.id}/exercise/${lesson.exercises[0].id}`);
      }
      setLoading(false);
    }, 1500);
  };

  if (preview.state === 'no_words') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="text-gray-400" size={28} />
          </div>
          <h2 className="text-xl font-bold mb-2">Нет новых слов</h2>
          <p className="text-[var(--color-text-secondary)] mb-6">
            В этом словаре нет новых слов для вашего уровня. Выберите другой словарь в настройках.
          </p>
          <button
            onClick={() => navigate('/settings/learning')}
            className="px-6 py-3 bg-[var(--color-primary)] text-white rounded-xl font-medium"
          >
            Сменить словарь
          </button>
        </div>
      </div>
    );
  }

  if (preview.state !== 'ready') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
      </div>
    );
  }

  const totalWords = (preview.due_words?.length || 0) + (preview.new_words?.length || 0);

  return (
    <div className="min-h-screen flex flex-col max-w-[640px] mx-auto">
      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 bg-white/90 z-50 flex flex-col items-center justify-center">
          <div className="animate-spin w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full mb-4" />
          <p className="text-lg font-medium text-[var(--color-text)]">Готовим урок…</p>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">Генерируем предложения</p>
        </div>
      )}

      {/* Header */}
      <div className="px-4 py-6">
        <button onClick={() => navigate('/')} className="text-sm text-[var(--color-text-secondary)] mb-4">
          ← Назад
        </button>
        <h1 className="text-2xl font-bold">Урок №{preview.lesson_number}</h1>
        <p className="text-[var(--color-text-secondary)] mt-1">{totalWords} слов в уроке</p>
      </div>

      {/* Dictionary exhausted banner */}
      {preview.dictionary_exhausted && (
        <div className="mx-4 mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
          <AlertTriangle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-700">
            Слова в словаре заканчиваются. После этого урока выберите другой словарь.
          </p>
        </div>
      )}

      {/* Due words */}
      {(preview.due_words?.length || 0) > 0 && (
        <div className="px-4 mb-4">
          <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">Повторение</h3>
          <div className="flex flex-wrap gap-2">
            {preview.due_words!.map(w => (
              <span key={w.word_id} className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm font-medium">
                {w.lemma}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* New words */}
      {(preview.new_words?.length || 0) > 0 && (
        <div className="px-4 mb-6">
          <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">Новые слова</h3>
          <div className="space-y-2">
            {preview.new_words!.map(w => (
              <div
                key={w.word_id}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                  declinedWords.has(w.word_id) ? 'opacity-40 border-gray-100 bg-gray-50' : 'border-[var(--color-border)] bg-white'
                }`}
              >
                <div>
                  <span className="font-medium">{w.lemma}</span>
                  <span className="text-xs text-[var(--color-text-secondary)] ml-2">{w.pos}</span>
                  <div className="text-sm text-[var(--color-text-secondary)]">{w.translations.join(', ')}</div>
                </div>
                {!declinedWords.has(w.word_id) && (
                  <button
                    onClick={() => handleDecline(w.word_id)}
                    className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                    title="Не добавлять"
                  >
                    <X size={16} className="text-gray-400" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Start button */}
      <div className="px-4 mt-auto pb-8">
        <button
          onClick={handleStart}
          disabled={loading || totalWords === 0}
          className="w-full py-4 bg-[var(--color-primary)] text-white font-semibold rounded-2xl hover:bg-[var(--color-primary-dark)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Поехали! 🚀
        </button>
      </div>
    </div>
  );
}
