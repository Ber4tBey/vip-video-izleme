import { useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './context/AuthContext';
import { VideoProvider } from './context/VideoContext';
import { AdminProvider } from './context/AdminContext';
import { AdsProvider } from './context/AdsContext';
import { SettingsProvider } from './context/SettingsContext';
import Layout from './components/layout/Layout';
import AgeVerificationModal from './components/modals/AgeVerificationModal';
import { getItem, STORAGE_KEYS } from './utils/storage';

// Eagerly load home (first paint)
import HomePage from './pages/home';

// Lazy load everything else for code splitting
const VideosPage = lazy(() => import('./pages/videos'));
const VIPPage = lazy(() => import('./pages/vip'));
const ModelsPage = lazy(() => import('./pages/models'));
const CategoriesPage = lazy(() => import('./pages/categories'));
const TrendsPage = lazy(() => import('./pages/trends'));
const BuyVIPPage = lazy(() => import('./pages/buy-vip'));
const LoginPage = lazy(() => import('./pages/login'));
const AdminPage = lazy(() => import('./pages/admin'));
const VideoPage = lazy(() => import('./pages/video'));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[40vh]">
    <div className="w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full animate-spin" />
  </div>
);

function App() {
  const [ageVerified, setAgeVerified] = useState(() =>
    getItem(STORAGE_KEYS.AGE_VERIFIED, false)
  );

  return (
    <HelmetProvider>
    <AuthProvider>
      <VideoProvider>
        <AdminProvider>
          <AdsProvider>
            <SettingsProvider>
          <BrowserRouter>
            {!ageVerified && (
              <AgeVerificationModal onVerify={() => setAgeVerified(true)} />
            )}
            <Layout>
              <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/videos" element={<VideosPage />} />
                <Route path="/vip" element={<VIPPage />} />
                <Route path="/models" element={<ModelsPage />} />
                <Route path="/models/:slug" element={<ModelsPage />} />
                <Route path="/categories" element={<CategoriesPage />} />
                <Route path="/categories/:slug" element={<CategoriesPage />} />
                <Route path="/trends" element={<TrendsPage />} />
                <Route path="/buy-vip" element={<BuyVIPPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/video/:slug" element={<VideoPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="*" element={<HomePage />} />
              </Routes>
              </Suspense>
            </Layout>
          </BrowserRouter>
            </SettingsProvider>
          </AdsProvider>
        </AdminProvider>
      </VideoProvider>
    </AuthProvider>
    </HelmetProvider>
  );
}

export default App;
