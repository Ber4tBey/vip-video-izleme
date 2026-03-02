import { ShieldAlert, Crown } from 'lucide-react';
import { useEffect } from 'react';
import { getItem, setItem, STORAGE_KEYS } from '../../utils/storage';

const AgeVerificationModal = ({ onVerify }) => {
  const handleConfirm = () => {
    setItem(STORAGE_KEYS.AGE_VERIFIED, true);
    onVerify();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4">
      <div className="w-full max-w-md bg-dark-800 border border-dark-500 rounded-2xl overflow-hidden shadow-2xl">
        {/* Top gradient bar */}
        <div className="h-1 bg-gradient-to-r from-primary-700 via-red-500 to-primary-700" />

        <div className="p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-red-900/30 border-2 border-red-600 flex items-center justify-center mx-auto mb-6">
            <ShieldAlert size={36} className="text-red-400" />
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">+18 İçerik</h1>
          <p className="text-gray-400 mb-6 leading-relaxed">
            Bu site <span className="text-red-400 font-semibold">18 yaş ve üzeri</span> bireylere
            yönelik yetişkin içerikler barındırmaktadır. Devam etmek için yaşınızı onaylamanız gerekmektedir.
          </p>

          <div className="space-y-3">
            <button
              onClick={handleConfirm}
              className="w-full btn-primary justify-center py-3 text-base bg-primary-700 hover:bg-primary-600"
            >
              <Crown size={18} />
              18 Yaş Üzerindeyim — Devam Et
            </button>
            <button
              onClick={() => window.location.href = 'https://www.google.com'}
              className="w-full btn-ghost justify-center py-3 text-base"
            >
              Siteden Ayrıl
            </button>
          </div>

          <p className="text-xs text-gray-600 mt-6">
            Devam ederek Hizmet Şartlarımızı ve Gizlilik Politikamızı kabul etmiş olursunuz.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AgeVerificationModal;
