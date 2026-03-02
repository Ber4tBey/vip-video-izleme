import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home, Play, Crown, Users, Tag, TrendingUp, ShoppingCart,
  LogIn, LogOut, Shield, X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { to: '/', icon: Home, label: 'Ana Sayfa', exact: true },
  { to: '/videos', icon: Play, label: 'Videolar' },
  { to: '/vip', icon: Crown, label: 'VIP Üyelere Özel' },
  { to: '/models', icon: Users, label: 'Modeller' },
  { to: '/categories', icon: Tag, label: 'Kategoriler' },
  { to: '/trends', icon: TrendingUp, label: 'Trendler' },
  
];

const Sidebar = ({ onClose }) => {
  const { isLoggedIn, isAdmin, currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    onClose();
    navigate('/');
  };

  const handleNavClick = () => {
    onClose();
  };

  return (
    <aside className="w-72 h-full flex flex-col bg-dark-800 border-r border-dark-600 shadow-2xl shadow-black/60">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-dark-600">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-600 to-red-700 flex items-center justify-center flex-shrink-0">
            <Crown size={16} className="text-white" />
          </div>
          <div>
            <span className="text-white font-bold text-lg leading-none">ONLYMIX</span>
            <span className="text-primary-400 font-bold text-lg leading-none">TUBE</span>
          </div>
        </div>
        {/* Close button */}
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-dark-500 transition-all"
          aria-label="Menüyü kapat"
        >
          <X size={18} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            onClick={handleNavClick}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <Icon size={20} className="flex-shrink-0" />
            <span className="truncate">{label}</span>
            {to === '/vip' && (
              <span className="ml-auto badge-vip">VIP</span>
            )}
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <div className="pt-3 pb-1 px-2">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Yönetim</p>
            </div>
            <NavLink
              to="/admin"
              onClick={handleNavClick}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
            >
              <Shield size={20} className="flex-shrink-0" />
              <span>Admin Panel</span>
            </NavLink>
          </>
        )}
      </nav>

      {/* User section */}
      <div className="border-t border-dark-600 p-4 space-y-3">
        {isLoggedIn ? (
          <>
            <div className="flex items-center gap-3 px-1">
              <div className="w-9 h-9 rounded-full bg-primary-700/40 border border-primary-700/60 flex items-center justify-center flex-shrink-0">
                <span className="text-primary-300 font-bold text-sm">
                  {currentUser?.username?.charAt(0)?.toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-white font-semibold text-sm truncate">{currentUser?.username}</p>
                {isAdmin && <p className="text-primary-400 text-xs">Admin</p>}
                {!isAdmin && currentUser?.is_vip && <span className="badge-vip text-xs">VIP</span>}
                {!isAdmin && !currentUser?.is_vip && <p className="text-gray-500 text-xs">Üye</p>}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-all text-sm font-medium"
            >
              <LogOut size={16} />
              Çıkış Yap
            </button>
          </>
        ) : (
          <NavLink
            to="/login"
            onClick={handleNavClick}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-dark-600 transition-all text-sm font-medium"
          >
            <LogIn size={16} />
            Giriş Yap
          </NavLink>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
