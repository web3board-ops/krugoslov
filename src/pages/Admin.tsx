import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Upload, Check } from 'lucide-react';

export function AdminPage() {
  const navigate = useNavigate();
  const { importDictionary } = useStore();
  const [importResult, setImportResult] = useState<any>(null);
  const [importing, setImporting] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const result = await importDictionary(file, false);
      setImportResult(result);
    } catch (error) {
      console.error('Import error:', error);
    }
    setImporting(false);
  };

  return (
    <div className="min-h-screen max-w-[640px] mx-auto px-4 py-6">
      <button onClick={() => navigate('/settings')} className="text-sm text-[var(--color-text-secondary)] mb-4">← Назад</button>
      <h1 className="text-xl font-bold mb-6">🛠 Админ-панель</h1>
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-6">
        <h3 className="font-medium mb-4">Импорт словаря из JSON</h3>
        <label className="block">
          <div className="border-2 border-dashed border-[var(--color-border)] rounded-xl p-8 text-center cursor-pointer hover:border-[var(--color-primary)]">
            <Upload size={32} className="mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-[var(--color-text-secondary)]">
              {importing ? 'Загрузка...' : 'Нажмите для выбора файла JSON'}
            </p>
          </div>
          <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" disabled={importing} />
        </label>
        {importResult && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Check size={16} className="text-green-600" />
              <span className="font-medium text-green-700 text-sm">Импорт завершён</span>
            </div>
            <div className="text-sm text-green-600">Добавлено: {importResult.added} слов</div>
            {importResult.skipped > 0 && (
              <div className="text-sm text-amber-600">Пропущено: {importResult.skipped}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
