import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export function ReviewPage() {
  const { lessonId, exerciseId } = useParams();
  const navigate = useNavigate();
  const { currentEvaluation } = useStore();
  const [hasNextExercise, setHasNextExercise] = useState(false);

  useEffect(() => {
    checkNextExercise();
  }, [exerciseId]);

  const checkNextExercise = async () => {
    try {
      const { lessonApi } = await import('../api/client');
      await lessonApi.getCurrent(Number(lessonId));
      setHasNextExercise(true);
    } catch (error) {
      setHasNextExercise(false);
    }
  };

  const handleNext = async () => {
    if (hasNextExercise) {
      try {
        const { lessonApi } = await import('../api/client');
        const nextExercise = await lessonApi.getCurrent(Number(lessonId));
        navigate(`/lesson/${lessonId}/exercise/${nextExercise.exercise_id}`);
      } catch (error) {
        console.error('Failed to get next exercise:', error);
        navigate(`/lesson/${lessonId}/complete`);
      }
    } else {
      navigate(`/lesson/${lessonId}/complete`);
    }
  };

  if (!currentEvaluation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-[var(--color-text-secondary)] mb-4">Нет данных для отображения</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-[var(--color-primary)] text-white rounded-xl"
          >
            На главную
          </button>
        </div>
      </div>
    );
  }

  const { target_sentence, reference_translation, user_translation, words, suggestions } = currentEvaluation;

  return (
    <div className="min-h-screen flex flex-col max-w-[640px] mx-auto bg-white px-4 py-6">
      <div className="flex-1">
        <h2 className="text-xl font-bold mb-4">Результаты упражнения</h2>

        {/* Предложение */}
        <div className="mb-6">
          <p className="text-sm text-[var(--color-text-secondary)] mb-2">Предложение:</p>
          <div className="p-4 bg-gray-50 rounded-xl text-lg font-medium">
            {target_sentence}
          </div>
        </div>

        {/* Перевод пользователя */}
        <div className="mb-6">
          <p className="text-sm text-[var(--color-text-secondary)] mb-2">Ваш перевод:</p>
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
            {user_translation || <span className="text-gray-400 italic">Не указано</span>}
          </div>
        </div>

        {/* Правильный перевод */}
        <div className="mb-6">
          <p className="text-sm text-[var(--color-text-secondary)] mb-2">Правильный перевод:</p>
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
            {reference_translation}
          </div>
        </div>

        {/* Целевые слова */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Целевые слова:</h3>
          <div className="space-y-3">
            {words.map((word: any) => {
              const isCorrect = word.result === 'correct' || word.result === 'typo';
              const Icon = isCorrect ? CheckCircle : XCircle;
              const colorClass = isCorrect ? 'text-green-600' : 'text-red-600';
              const bgClass = isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';

              return (
                <div key={word.word_id} className={`p-4 rounded-xl border ${bgClass}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon size={20} className={colorClass} />
                      <span className="font-semibold text-lg">{word.lemma}</span>
                      <span className="text-sm text-gray-500">({word.pos})</span>
                    </div>
                    <span className={`text-sm font-medium ${colorClass}`}>
                      {word.result === 'correct' ? 'Верно' : word.result === 'typo' ? 'Опечатка' : 'Неверно'}
                    </span>
                  </div>

                  {!isCorrect && (
                    <div className="mt-2 space-y-1">
                      <div className="text-sm">
                        <span className="text-gray-600">Ваш перевод: </span>
                        <span className="text-red-600">
                          {word.user_fragment || <span className="italic">не указан</span>}
                        </span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-600">Правильный перевод: </span>
                        <span className="text-green-600 font-medium">
                          {word.translations.join(', ')}
                        </span>
                      </div>
                    </div>
                  )}

                  {isCorrect && (
                    <div className="text-sm text-gray-600 mt-1">
                      Перевод: {word.translations.join(', ')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Подсказки новых слов */}
        {suggestions && suggestions.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Новые слова для изучения:</h3>
            <div className="space-y-2">
              {suggestions.map((word: any) => (
                <div key={word.word_id} className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{word.lemma}</span>
                    <span className="text-sm text-gray-500">({word.pos})</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {word.translations.join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <button
        onClick={handleNext}
        className="w-full py-4 bg-[var(--color-primary)] text-white font-semibold rounded-xl hover:bg-[var(--color-primary-dark)] transition-colors"
      >
        {hasNextExercise ? 'Следующее упражнение' : 'Завершить урок'}
      </button>
    </div>
  );
}
