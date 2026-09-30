import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store';

export function ReviewPage() {
  const { lessonId, exerciseId } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState<any>(null);
  const [hasNextExercise, setHasNextExercise] = useState(false);

  useEffect(() => {
    // Result is already evaluated, just show it
    setResult({ exercise_id: Number(exerciseId) });
    checkNextExercise();
  }, [exerciseId]);

  const checkNextExercise = async () => {
    try {
      const { lessonApi } = await import('../api/client');
      await lessonApi.getCurrent(Number(lessonId));
      setHasNextExercise(true);
    } catch (error) {
      // No more pending exercises
      setHasNextExercise(false);
    }
  };

  const handleNext = () => {
    if (hasNextExercise) {
      navigate(`/lesson/${lessonId}/current`);
    } else {
      navigate(`/lesson/${lessonId}/complete`);
    }
  };

  if (!result) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="min-h-screen flex flex-col max-w-[640px] mx-auto bg-white px-4 py-6">
      <div className="flex-1">
        <h2 className="text-xl font-bold mb-4">Результат</h2>
        <p className="text-sm text-[var(--color-text-secondary)] mb-4">Упражнение проверено</p>
      </div>
      <button
        onClick={handleNext}
        className="w-full py-4 bg-[var(--color-primary)] text-white font-semibold rounded-xl"
      >
        {hasNextExercise ? 'Следующее упражнение' : 'Завершить урок'}
      </button>
    </div>
  );
}
