import { Search, Bell, Crown, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

const Header = ({ onMenuToggle }) => {
  const { isLoggedIn, isVIP, isAdmin, currentUser } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/videos?q=${encodeURIComponent(search.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 glass flex items-center gap-4 px-4 border-b border-dark-500/50">
      {/* Hamburger — sadece mobilde görünür */}
      <button
        onClick={onMenuToggle}
        className="lg:hidden text-gray-400 hover:text-white transition-colors flex-shrink-0"
        aria-label="Menüyü aç/kapat"
      >
        <Menu size={22} />
      </button>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex-1 max-w-xl">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Video ara..."
            className="input-field pl-9 py-2 text-sm"
          />
        </div>
      </form>

      <div className="flex items-center gap-3 ml-auto">
        {!isLoggedIn && (
          <button
            onClick={() => navigate('/login')}
            className="btn-ghost text-sm py-1.5"
          >
            <span className="hidden sm:inline">Giriş Yap</span>
            <span className="sm:hidden">Giriş</span>
          </button>
        )}
        {!isVIP && !isAdmin && (
          <button
            onClick={() => navigate('/vip')}
            className="btn-vip text-sm py-1.5 animate-pulse-gold"
          >
            <Crown size={14} />
            <span className="hidden sm:inline">VIP Ol</span>
          </button>
        )}
        {(isVIP || isAdmin) && (
          <span className="badge-vip">
            <Crown size={12} />
            {isAdmin ? 'Admin' : 'VIP'}
          </span>
        )}
      </div>
    </header>
  );
};

export default Header;
