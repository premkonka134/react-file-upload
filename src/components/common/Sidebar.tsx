import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Files, Users, FolderOpen, BarChart3 } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isOpen: boolean;
  onClose: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  isOpen = true, // default true for large screens
  onClose
}) => {
  const { user } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'myFiles', label: 'My Files', icon: Files },
    { id: 'teamFiles', label: 'Team Files', icon: FolderOpen },
    ...(user?.role === 'admin'
      ? [{ id: 'admin', label: 'Admin Portal', icon: Users }]
      : []),
  ];

  return (
    <div
      className={`bg-gray-50 w-64 min-h-screen border-r border-gray-200
        ${isOpen ? 'block' : 'hidden'} lg:block`}
    >
      <nav className="mt-8">
        <div className="px-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  if (onClose) onClose(item.id); // Close menu on mobile
                }}
                className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg mb-2 transition-colors ${activeTab === item.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                  }`}
              >
                <Icon size={20} className="mr-3" />
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
