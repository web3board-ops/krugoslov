import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Globe, LogOut, AlertTriangle, ChevronRight } from 'lucide-react';

const TIMEZONES = [
  'Europe/Moscow', 'Europe/London', 'Europe/Berlin', 'Europe/Paris',
  'America/New_York', 'America/Los_Angeles', 'Asia/Tokyo', 'Asia/Shanghai',
  'Asia/Dubai', 'Australia/Sydney',
];

export function SettingsPage() {
  const navigate = useNavigate();
  const { user, updateTimezone, logout } = useStore();
  const [selectedTimezone, setSelectedTimezone] = useState(user?.timezone || 'Europe/Moscow');
  const [showTimezoneAlert, setShowTimezoneAlert] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  if (!user) return null;

  const handleTimezoneChange = () => {
    if (selectedTimezone === user.timezone) return;
    setShowTimezoneAlert(true);
  };

  const confirmTimezoneChange = () => {
    updateTimezone(selectedTimezone);
    setShowTimezoneAlert(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <div className="px-4 py-6 max-w-[640px] mx-auto">
      <button onClick={() => navigate('/')} className="text-sm text-[var(--color-text-secondary)] mb-4">
        ← Назад
      </button>
      <h1 className="text-xl font-bold mb-6">Настройки</h1>

      {/* Timezone */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-4 mb-4">
        <div className="flex items-center gap-3 mb-3">
          <Globe size={18} className="text-[var(--color-primary)]" />
          <span className="font-medium text-sm">Часовой пояс</span>
        </div>
        <select
          value={selectedTimezone}
          onChange={e => setSelectedTimezone(e.target.value)}
          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        >
          {TIMEZONES.map(tz => (
            <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>
          ))}
        </select>
        {selectedTimezone !== user.timezone && (
          <button
            onClick={handleTimezoneChange}
            className="mt-2 text-sm text-[var(--color-primary)] font-medium"
          >
            Сохранить
          </button>
        )}
      </div>

      {/* Learning settings link */}
      <button
        onClick={() => navigate('/settings/learning')}
        className="w-full bg-white rounded-xl border border-[var(--color-border)] p-4 flex items-center justify-between card-hover mb-4"
      >
        <span className="font-medium text-sm">Настройки обучения</span>
        <ChevronRight size={16} className="text-gray-400" />
      </button>

      {/* Admin link */}
      {user.is_admin && (
        <>
          <button
            onClick={() => navigate('/admin')}
            className="w-full bg-white rounded-xl border border-[var(--color-border)] p-4 flex items-center justify-between card-hover mb-4"
          >
            <span className="font-medium text-sm">🛠 Админ-панель</span>
            <ChevronRight size={16} className="text-gray-400" />
          </button>
          <button
            onClick={() => navigate('/admin/prompts')}
            className="w-full bg-white rounded-xl border border-[var(--color-border)] p-4 flex items-center justify-between card-hover mb-4"
          >
            <span className="font-medium text-sm">📝 Управление промптами</span>
            <ChevronRight size={16} className="text-gray-400" />
          </button>
        </>
      )}

      {/* Logout */}
      <button
        onClick={() => setShowLogoutConfirm(true)}
        className="w-full bg-white rounded-xl border border-red-200 p-4 flex items-center gap-3 text-red-600 card-hover"
      >
        <LogOut size={18} />
        <span className="font-medium text-sm">Выйти из аккаунта</span>
      </button>

      {/* Timezone alert modal */}
      {showTimezoneAlert && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full animate-slide-up">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={20} className="text-amber-500" />
              <h3 className="text-lg font-bold">Смена часового пояса</h3>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] mb-2">
              Смена часового пояса меняет границу дня.
            </p>
            <p className="text-sm text-[var(--color-text-secondary)] mb-6">
              Следующую смену можно будет сделать через 7 дней.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowTimezoneAlert(false)}
                className="flex-1 py-3 border border-[var(--color-border)] rounded-xl font-medium"
              >
                Отмена
              </button>
              <button
                onClick={confirmTimezoneChange}
                className="flex-1 py-3 bg-[var(--color-primary)] text-white rounded-xl font-medium"
              >
                Сменить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout confirm modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full animate-slide-up">
            <h3 className="text-lg font-bold mb-2">Выйти из аккаунта?</h3>
            <p className="text-sm text-[var(--color-text-secondary)] mb-6">
              Ваш прогресс сохранён и будет доступен при следующем входе.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-3 border border-[var(--color-border)] rounded-xl font-medium"
              >
                Отмена
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-medium"
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
