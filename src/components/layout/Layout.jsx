import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import AdBanner from '../ui/AdBanner';

const Layout = ({ children }) => {
  // Sadece mobil için kullanılır; desktop'ta sidebar her zaman açık
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-dark-900 flex">
      {/* Mobil overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/*
        DESKTOP: fixed + her zaman görünür (translate-x-0)
        MOBİL:  fixed + mobileOpen'a göre görünür/gizli
      */}
      <aside className={`
        fixed inset-y-0 left-0 z-40
        transition-transform duration-300 ease-in-out
        lg:translate-x-0
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar onClose={() => setMobileOpen(false)} />
      </aside>

      {/*
        Ana içerik:
        - Desktop: sidebar her zaman açık → sol margin = sidebar genişliği (w-72 = 18rem)
        - Mobil: sidebar overlay → margin yok
      */}
      <div className="flex-1 flex flex-col min-h-screen w-full lg:pl-72">
        <Header onMenuToggle={() => setMobileOpen(!mobileOpen)} />
        <main className="flex-1 p-6 animate-fade-in">
          {children}
        </main>
        {/* Reklam — footer üstü (her sayfada gösterilir) */}
        <div className="px-6 pb-2">
          <AdBanner slotId="footer-leaderboard" size="leaderboard" />
        </div>
        <footer className="text-center py-4 text-xs text-gray-600 border-t border-dark-700">
          © 2026 ONLYMIX.  — Tüm hakları saklıdır.
        </footer>
      </div>
    </div>
  );
};

export default Layout;
