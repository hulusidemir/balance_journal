import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Calculator, Settings, LogOut, Wallet, Layers, ChevronDown, ChevronRight, ExternalLink, Menu, X } from 'lucide-react';
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
  const [isServicesOpen, setIsServicesOpen] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

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
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-3">
          <Wallet className="text-green-500 shrink-0" size={24} />
          <h1 className="text-lg font-bold text-white tracking-widest uppercase font-mono">Balance Journal</h1>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="text-gray-400 hover:text-white p-2"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={clsx(
        "fixed md:static inset-y-0 left-0 z-50 w-64 bg-gray-800 border-r border-gray-700 flex flex-col transition-transform duration-300 ease-in-out",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="p-6 border-b border-gray-700 flex items-center gap-3 hidden md:flex">
          <Wallet className="text-green-500 shrink-0" size={28} />
          <h1 className="text-lg font-bold text-white tracking-widest uppercase font-mono whitespace-nowrap">Balance Journal</h1>
        </div>

        {/* Mobile Menu Header (inside sidebar) */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between md:hidden">
           <span className="text-gray-400">Menu</span>
           <button onClick={() => setIsMobileMenuOpen(false)} className="text-gray-400 hover:text-white">
             <X size={20} />
           </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
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

          {/* Services Section */}
          <div>
            <button
              onClick={() => setIsServicesOpen(!isServicesOpen)}
              className={clsx(
                'w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors',
                isServicesOpen ? 'text-white bg-gray-700' : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              )}
            >
              <div className="flex items-center gap-3">
                <Layers size={20} />
                <span>{t('nav.services')}</span>
              </div>
              {isServicesOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            
            {isServicesOpen && (
              <div className="mt-1 ml-4 space-y-1 border-l border-gray-700 pl-2">
                <a
                  href="https://bybit-client.onrender.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
                >
                  <ExternalLink size={16} />
                  <span>Trader Paneli</span>
                </a>
                <a
                  href="https://hulusiwarroom.onrender.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
                >
                  <ExternalLink size={16} />
                  <span>Coin MR</span>
                </a>
                <a
                  href="https://bybit-screener-ui.onrender.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
                >
                  <ExternalLink size={16} />
                  <span>Coin Scan</span>
                </a>

              </div>
            )}
          </div>

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
      <main className="flex-1 overflow-auto bg-gray-900 p-4 md:p-8 pt-20 md:pt-8">
        {children}
      </main>
    </div>
  );
};

export default MainLayout;
