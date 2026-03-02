import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { Crown, Send } from 'lucide-react';

// Blocks access if not VIP
export const VIPRoute = ({ children }) => {
  const { isVIP, isAdmin } = useAuth();
  const { settings } = useSettings();
  if (isVIP || isAdmin) return children;

  const tgLink = settings.telegramLink || 'https://t.me/yourusername';

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
      <div className="w-24 h-24 rounded-full bg-vip-gold/10 border-2 border-vip-gold flex items-center justify-center mb-6 animate-pulse-gold">
        <Crown size={36} className="text-vip-gold" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-3">VIP Üyelik Gerekli</h2>
      <p className="text-gray-400 max-w-md mb-8">
        Bu içeriklere erişmek için VIP üyeliğinizin olması gerekmektedir.
        VIP üyelik ile tüm özel içeriklere sınırsız erişin.
      </p>
      <a
        href={tgLink}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-vip text-base px-8 py-3"
      >
        <Send size={18} />
        Telegram'dan VIP Üyelik Al
      </a>
    </div>
  );
};

// Blocks access if not admin
export const AdminRoute = ({ children }) => {
  const { isAdmin } = useAuth();
  if (isAdmin) return children;
  return <Navigate to="/" replace />;
};
