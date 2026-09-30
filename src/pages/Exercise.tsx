import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { lessonApi } from '../api/client';

export function ExercisePage() {
  const { lessonId, exerciseId } = useParams();
  const navigate = useNavigate();
  const { evaluateExercise } = useStore();
  const [translation, setTranslation] = useState('');
  const [loading, setLoading] = useState(false);
  const [exercise, setExercise] = useState<any>(null);

  useEffect(() => {
    loadExercise();
  }, [exerciseId]);

  const loadExercise = async () => {
    try {
      const data = await lessonApi.getCurrent(Number(lessonId));
      setExercise(data);
    } catch (error) {
      console.error('Failed to load exercise:', error);
    }
  };

  const handleSubmit = async () => {
    if (!translation.trim()) return;
    setLoading(true);
    try {
      const result = await evaluateExercise(Number(exerciseId), translation.trim(), false);
      console.log('Evaluation result:', result);
      
      // Всегда переходим на Review, а оттуда решаем - следующее упражнение или завершение
      navigate(`/lesson/${lessonId}/review/${exerciseId}`);
    } catch (error) {
      console.error('Failed to evaluate:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDontKnow = async () => {
    setLoading(true);
    try {
      const result = await evaluateExercise(Number(exerciseId), null, true);
      console.log('Evaluation result (dont know):', result);
      
      // Всегда переходим на Review
      navigate(`/lesson/${lessonId}/review/${exerciseId}`);
    } catch (error) {
      console.error('Failed to evaluate:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!exercise) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col max-w-[640px] mx-auto bg-white px-4 py-6">
      <div className="flex-1 flex flex-col justify-center">
        <p className="text-sm text-[var(--color-text-secondary)] mb-3">Переведите на русский:</p>
        <div className="text-xl font-medium leading-relaxed mb-8 p-4 bg-gray-50 rounded-xl">
          {exercise.sentence}
        </div>
        <textarea
          value={translation}
          onChange={e => setTranslation(e.target.value)}
          placeholder="Введите перевод на русский..."
          className="w-full min-h-[120px] p-4 border border-[var(--color-border)] rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          maxLength={500}
          disabled={loading}
        />
      </div>

      <div className="space-y-3 pb-6">
        <button
          onClick={handleSubmit}
          disabled={!translation.trim() || loading}
          className="w-full py-4 bg-[var(--color-primary)] text-white font-semibold rounded-xl disabled:opacity-50 flex items-center justify-center"
        >
          {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Проверить'}
        </button>
        <button
          onClick={handleDontKnow}
          disabled={loading}
          className="w-full py-3 border border-[var(--color-border)] rounded-xl"
        >
          Не знаю
        </button>
      </div>
    </div>
  );
}
