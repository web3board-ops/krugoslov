import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Globe, GraduationCap, ChevronRight } from 'lucide-react';
import { Level } from '../types';

const TIMEZONES = [
  'Europe/Moscow', 'Europe/London', 'Europe/Berlin', 'Europe/Paris',
  'America/New_York', 'America/Los_Angeles', 'Asia/Tokyo', 'Asia/Shanghai',
  'Asia/Dubai', 'Australia/Sydney',
];

const LEVELS: { value: Level; title: string; description: string }[] = [
  { value: 'A1', title: 'A1 — Начальный', description: 'Понимаю и использую простые фразы для повседневных ситуаций' },
  { value: 'A2', title: 'A2 — Элементарный', description: 'Понимаю предложения и часто используемые выражения' },
  { value: 'B1', title: 'B1 — Средний', description: 'Понимаю основное содержание текстов на знакомые темы' },
  { value: 'B2', title: 'B2 — Выше среднего', description: 'Понимаю сложные тексты, могу спонтанно общаться' },
];

export function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Moscow');
  const [level, setLevel] = useState<Level>('A1');
  const { completeOnboarding } = useStore();
  const navigate = useNavigate();

  const handleComplete = () => {
    completeOnboarding(timezone, level);
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-indigo-50 to-white">
      <div className="w-full max-w-sm">
        {/* Progress */}
        <div className="flex gap-2 mb-8">
          <div className={`flex-1 h-1.5 rounded-full ${step >= 1 ? 'bg-[var(--color-primary)]' : 'bg-gray-200'}`} />
          <div className={`flex-1 h-1.5 rounded-full ${step >= 2 ? 'bg-[var(--color-primary)]' : 'bg-gray-200'}`} />
        </div>

        {step === 1 && (
          <div className="animate-fade-in">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Globe className="text-[var(--color-primary)]" size={28} />
              </div>
              <h2 className="text-xl font-bold">Ваш часовой пояс</h2>
              <p className="text-[var(--color-text-secondary)] mt-1 text-sm">
                Это нужно для правильного подсчёта стрика и лимитов
              </p>
            </div>

            <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
              {TIMEZONES.map(tz => (
                <button
                  key={tz}
                  onClick={() => setTimezone(tz)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                    timezone === tz
                      ? 'border-[var(--color-primary)] bg-indigo-50 text-[var(--color-primary)]'
                      : 'border-[var(--color-border)] hover:border-gray-300'
                  }`}
                >
                  <span className="font-medium text-sm">{tz.replace('_', ' ')}</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full py-3 bg-[var(--color-primary)] text-white font-medium rounded-xl hover:bg-[var(--color-primary-dark)] transition-colors flex items-center justify-center gap-2"
            >
              Далее <ChevronRight size={18} />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="text-[var(--color-primary)]" size={28} />
              </div>
              <h2 className="text-xl font-bold">Ваш уровень английского</h2>
              <p className="text-[var(--color-text-secondary)] mt-1 text-sm">
                Мы будем подбирать слова подходящей сложности
              </p>
            </div>

            <div className="space-y-2 mb-6">
              {LEVELS.map(l => (
                <button
                  key={l.value}
                  onClick={() => setLevel(l.value)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                    level === l.value
                      ? 'border-[var(--color-primary)] bg-indigo-50'
                      : 'border-[var(--color-border)] hover:border-gray-300'
                  }`}
                >
                  <div className={`font-medium text-sm ${level === l.value ? 'text-[var(--color-primary)]' : ''}`}>
                    {l.title}
                  </div>
                  <div className="text-xs text-[var(--color-text-secondary)] mt-0.5">{l.description}</div>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 border border-[var(--color-border)] text-[var(--color-text)] font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                Назад
              </button>
              <button
                onClick={handleComplete}
                className="flex-1 py-3 bg-[var(--color-primary)] text-white font-medium rounded-xl hover:bg-[var(--color-primary-dark)] transition-colors"
              >
                Начать!
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
