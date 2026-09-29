import { useNavigate } from 'react-router-dom';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-2xl font-bold mb-2">Страница не найдена</h1>
        <p className="text-[var(--color-text-secondary)] mb-6">
          Возможно, она была перемещена или удалена
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 bg-[var(--color-primary)] text-white font-medium rounded-xl hover:bg-[var(--color-primary-dark)] transition-colors"
        >
          На главную
        </button>
      </div>
    </div>
  );
}
