import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Header } from '../common/Header';
import { Sidebar } from '../common/Sidebar';
import { MyFilesPage } from '../../pages/MyFilesPage';
import { TeamFilesPage } from '../../pages/TeamFilesPage';
import { AdminPage } from '../../pages/AdminPage';
import { DashboardPage } from '../../pages/DashboardPage';
import { useAuth } from '../../contexts/AuthContext';

export const Layout: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage />;
      case 'myFiles':
        return <MyFilesPage />;
      case 'teamFiles':
        return <TeamFilesPage />;
      case 'admin':
        return user?.role === 'admin' ? <AdminPage /> : <DashboardPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Mobile menu button */}
      <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-2">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors p-2 -m-2"
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          <span className="text-sm font-medium">Menu</span>
        </button>
      </div>
      
      <div className="flex">
        <Sidebar 
          activeTab={activeTab} 
          onTabChange={setActiveTab}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="flex-1 min-w-0">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};