import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Upload, FileText, AlertCircle, Check } from 'lucide-react';

export function AdminPage() {
  const navigate = useNavigate();
  const { importDictionary } = useStore();
  const [activeTab, setActiveTab] = useState<'import' | 'reports' | 'users'>('import');
  const [importResult, setImportResult] = useState<{ added: number; skipped: number } | null>(null);
  const [importing, setImporting] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (data.words && Array.isArray(data.words)) {
        const result = importDictionary(data.dictionary?.name || file.name, data.words);
        setImportResult(result);
      } else {
        setImportResult({ added: 0, skipped: 0 });
      }
    } catch (err) {
      console.error('Import error:', err);
    }
    setImporting(false);
  };

  const tabs = [
    { id: 'import', label: 'Импорт словаря' },
    { id: 'reports', label: 'Жалобы' },
    { id: 'users', label: 'Пользователи' },
  ];

  return (
    <div className="min-h-screen max-w-[640px] mx-auto px-4 py-6">
      <button onClick={() => navigate('/settings')} className="text-sm text-[var(--color-text-secondary)] mb-4">
        ← Назад
      </button>
      <h1 className="text-xl font-bold mb-6">🛠 Админ-панель</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === tab.id ? 'bg-white shadow-sm text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Import tab */}
      {activeTab === 'import' && (
        <div className="animate-fade-in">
          <div className="bg-white rounded-xl border border-[var(--color-border)] p-6">
            <h3 className="font-medium mb-4">Импорт словаря из JSON</h3>
            
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-[var(--color-text-secondary)] mb-2">Формат файла:</p>
              <pre className="text-xs text-gray-600 overflow-x-auto">
{`{
  "dictionary": { "name": "...", "is_general": false },
  "words": [
    { "lemma": "word", "pos": "noun", 
      "level": "A1", "translations": ["слово"] }
  ]
}`}
              </pre>
            </div>

            <label className="block">
              <div className="border-2 border-dashed border-[var(--color-border)] rounded-xl p-8 text-center cursor-pointer hover:border-[var(--color-primary)] transition-colors">
                <Upload size={32} className="mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {importing ? 'Загрузка...' : 'Нажмите для выбора файла JSON'}
                </p>
              </div>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
                disabled={importing}
              />
            </label>

            {importResult && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Check size={16} className="text-green-600" />
                  <span className="font-medium text-green-700 text-sm">Импорт завершён</span>
                </div>
                <div className="text-sm text-green-600">
                  Добавлено: {importResult.added} слов
                </div>
                {importResult.skipped > 0 && (
                  <div className="text-sm text-amber-600">
                    Пропущено (дубликаты): {importResult.skipped}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reports tab */}
      {activeTab === 'reports' && (
        <div className="animate-fade-in">
          <div className="bg-white rounded-xl border border-[var(--color-border)] p-6 text-center">
            <AlertCircle size={32} className="mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-[var(--color-text-secondary)]">
              Жалоб пока нет. Они появятся, когда пользователи будут жаловаться на предложения.
            </p>
          </div>
        </div>
      )}

      {/* Users tab */}
      {activeTab === 'users' && (
        <div className="animate-fade-in">
          <div className="bg-white rounded-xl border border-[var(--color-border)] p-6">
            <h3 className="font-medium mb-4">Поиск пользователя</h3>
            <input
              type="email"
              placeholder="Email пользователя..."
              className="w-full px-4 py-3 border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] mb-4"
            />
            <p className="text-xs text-[var(--color-text-secondary)]">
              В демо-версии управление пользователями ограничено. В полной версии здесь будет поиск, сброс пароля и просмотр статистики.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
