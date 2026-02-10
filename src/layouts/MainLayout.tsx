import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Calculator, Settings, LogOut, Wallet, Layers, ChevronDown, ChevronRight, ExternalLink, Menu, X, CreditCard, ChevronLeft } from 'lucide-react';
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
  const [isCollapsed, setIsCollapsed] = React.useState(false);

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
    { path: '/debts', label: t('debts.title'), icon: CreditCard },

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
        "fixed md:static inset-y-0 left-0 z-50 bg-gray-800 border-r border-gray-700 flex flex-col transition-all duration-300 ease-in-out",
        isMobileMenuOpen ? "translate-x-0 w-64" : "-translate-x-full md:translate-x-0",
        isCollapsed ? "md:w-20" : "md:w-64"
      )}>
        <div className={clsx("p-6 border-b border-gray-700 flex items-center gap-3 hidden md:flex", isCollapsed && "justify-center p-4")}>
          <Wallet className="text-green-500 shrink-0" size={isCollapsed ? 32 : 28} />
          {!isCollapsed && <h1 className="text-lg font-bold text-white tracking-widest uppercase font-mono whitespace-nowrap">Balance Journal</h1>}
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
                title={isCollapsed ? item.label : undefined}
                className={clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                  isActive
                    ? 'bg-green-600 text-white'
                    : 'text-gray-400 hover:bg-gray-700 hover:text-white',
                  isCollapsed && "justify-center px-2"
                )}
              >
                <Icon size={24} />
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}

          {/* Services Section */}
          <div>
            <button
              onClick={() => !isCollapsed && setIsServicesOpen(!isServicesOpen)}
              title={isCollapsed ? t('nav.services') : undefined}
              className={clsx(
                'w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors',
                isServicesOpen ? 'text-white bg-gray-700' : 'text-gray-400 hover:bg-gray-700 hover:text-white',
                isCollapsed && "justify-center px-2"
              )}
            >
              <div className="flex items-center gap-3">
                <Layers size={24} />
                {!isCollapsed && <span>{t('nav.services')}</span>}
              </div>
              {!isCollapsed && (isServicesOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
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
            {isCollapsed && isServicesOpen && (
              // Could add a popover here for collapsed mode services, but for now user likely expands sidebar to access services
              // Or we can just disable opening services when collapsed or auto-expand. 
              // Simple approach: uncollapsing on interaction if needed, or just keep as is (user must expand to see subs).
              // Actually, let's just hide the list if collapsed, or the list will be weird.
              // A better UX for collapsed sidebar with submenus requires a floating menu. 
              // For this iteration, clicking Services in collapsed mode could just expand the sidebar?
              // Let's keep it simple: if collapsed, the button doesn't toggle submenu, maybe it expands sidebar?
              // Or just hide the arrow and prevent toggle.
              null
            )}
          </div>

          <button
            onClick={handleLogout}
            title={isCollapsed ? t('nav.logout') : undefined}
            className={clsx(
              "w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-gray-700 hover:text-red-300 rounded-lg transition-colors",
              isCollapsed && "justify-center px-2"
            )}
          >
            <LogOut size={24} />
            {!isCollapsed && <span>{t('nav.logout')}</span>}
          </button>
        </nav>

        <div className="p-4 border-t border-gray-700 space-y-4">
          {/* Collapse Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full flex items-center justify-center p-2 text-gray-500 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors hidden md:flex"
          >
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>

          {!isCollapsed && (
            <div className="flex justify-center">
              <LanguageSwitcher />
            </div>
          )}
          {!isCollapsed && (
            <div className="text-center text-xs text-gray-500 pt-2 border-t border-gray-700/50">
              by Hulusi DEMİR
            </div>
          )}
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
