import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Calculator, Settings, LogOut, Wallet } from 'lucide-react';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useAuth } from '../contexts/AuthContext';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const navItems = [
    { path: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { path: '/calculator', label: t('nav.calculator'), icon: Calculator },
    { path: '/settings', label: t('nav.settings'), icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-6 border-b border-gray-700 flex items-center gap-3">
          <Wallet className="text-green-500 shrink-0" size={28} />
          <h1 className="text-lg font-bold text-white tracking-widest uppercase font-mono whitespace-nowrap">Balance Journal</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                  isActive 
                    ? 'bg-green-600 text-white' 
                    : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                )}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-gray-700 hover:text-red-300 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span>{t('nav.logout')}</span>
          </button>
        </nav>

        <div className="p-4 border-t border-gray-700 space-y-4">
          <div className="flex justify-center">
            <LanguageSwitcher />
          </div>
          <div className="text-center text-xs text-gray-500 pt-2 border-t border-gray-700/50">
            by Hulusi DEMİR
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-gray-900 p-8">
        {children}
      </main>
    </div>
  );
};

export default MainLayout;
