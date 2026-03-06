import { useState, useEffect } from 'react';
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

import HomePage from './pages/home';
import VideosPage from './pages/videos';
import VIPPage from './pages/vip';
import ModelsPage from './pages/models';
import CategoriesPage from './pages/categories';
import TrendsPage from './pages/trends';
import BuyVIPPage from './pages/buy-vip';
import LoginPage from './pages/login';
import AdminPage from './pages/admin';
import VideoPage from './pages/video';

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
