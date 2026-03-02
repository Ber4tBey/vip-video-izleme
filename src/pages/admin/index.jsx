import { useState } from 'react';
import { Shield, Users, Play, Tag, LayoutGrid, Megaphone, Settings } from 'lucide-react';
import { AdminRoute } from '../../components/auth/ProtectedRoute';
import UserManagement from './components/UserManagement';
import VideoManagement from './components/VideoManagement';
import ModelManagement from './components/ModelManagement';
import CategoryManagement from './components/CategoryManagement';
import AdManagement from './components/AdManagement';
import SiteSettings from './components/SiteSettings';

const tabs = [
  { id: 'users', label: 'Kullanıcılar', icon: Users },
  { id: 'videos', label: 'Videolar', icon: Play },
  { id: 'models', label: 'Modeller', icon: LayoutGrid },
  { id: 'categories', label: 'Kategoriler', icon: Tag },
  { id: 'ads', label: 'Reklamlar', icon: Megaphone },
  { id: 'settings', label: 'Ayarlar', icon: Settings },
];

const AdminPage = () => {
  const [activeTab, setActiveTab] = useState('users');

  const renderTab = () => {
    switch (activeTab) {
      case 'users': return <UserManagement />;
      case 'videos': return <VideoManagement />;
      case 'models': return <ModelManagement />;
      case 'categories': return <CategoryManagement />;
      case 'ads': return <AdManagement />;
      case 'settings': return <SiteSettings />;
      default: return null;
    }
  };

  return (
    <AdminRoute>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-700/30 border border-primary-700/50 flex items-center justify-center">
            <Shield size={20} className="text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
            <p className="text-gray-500 text-sm">Site yönetimi ve içerik kontrolü</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-dark-600 pb-0">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-all ${
                activeTab === id
                  ? 'border-primary-500 text-primary-400 bg-primary-900/20'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        <div className="animate-fade-in">
          {renderTab()}
        </div>
      </div>
    </AdminRoute>
  );
};

export default AdminPage;
