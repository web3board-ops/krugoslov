import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home, BookOpen, User } from 'lucide-react';

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const tabs = [
    { path: '/', icon: Home, label: 'Главная' },
    { path: '/vocabulary', icon: BookOpen, label: 'Словарь' },
    { path: '/profile', icon: User, label: 'Профиль' },
  ];

  return (
    <div className="flex flex-col min-h-screen max-w-[640px] mx-auto">
      <main className="flex-1 pb-20">
        <Outlet />
      </main>
      
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--color-border)] z-50">
        <div className="max-w-[640px] mx-auto flex">
          {tabs.map(tab => {
            const isActive = location.pathname === tab.path || 
              (tab.path !== '/' && location.pathname.startsWith(tab.path));
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={`flex-1 flex flex-col items-center py-3 px-2 transition-colors ${
                  isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'
                }`}
              >
                <tab.icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
                <span className="text-xs mt-1 font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
