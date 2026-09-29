import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { lessonApi } from '../api/client';

export function ResumePage() {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const { abandonLesson } = useStore();
  const [lesson, setLesson] = useState<any>(null);

  useEffect(() => {
    loadLesson();
  }, [lessonId]);

  const loadLesson = async () => {
    try {
      const data = await lessonApi.getCurrent(Number(lessonId));
      setLesson(data);
    } catch (error) {
      console.error('Failed to load lesson:', error);
    }
  };

  const handleContinue = () => {
    if (lesson) {
      navigate(`/lesson/${lessonId}/exercise/${lesson.exercise_id}`);
    }
  };

  const handleRestart = async () => {
    await abandonLesson(Number(lessonId));
    navigate('/lesson/new');
  };

  if (!lesson) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="min-h-screen flex flex-col max-w-[640px] mx-auto px-4 py-8">
      <button onClick={() => navigate('/')} className="text-sm text-[var(--color-text-secondary)] mb-6">← На главную</button>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold">Незавершённый урок</h1>
      </div>
      <div className="space-y-3 mt-auto">
        <button onClick={handleContinue} className="w-full py-4 bg-[var(--color-primary)] text-white font-semibold rounded-xl">Продолжить</button>
        <button onClick={handleRestart} className="w-full py-3 border border-[var(--color-border)] rounded-xl">Начать заново</button>
      </div>
    </div>
  );
}
