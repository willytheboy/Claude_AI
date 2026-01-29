import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Brain,
  BookOpen,
  Users,
  MessageSquare,
  Image,
  Share2,
  Zap,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';
import { OverviewTab } from './OverviewTab';
import { AITrainingTab } from './AITrainingTab';
import { KnowledgeTab } from './KnowledgeTab';
import { CustomersTab } from './CustomersTab';
import { ConversationsTab } from './ConversationsTab';
import { ImagesTab } from './ImagesTab';
import { SocialLinksTab } from './SocialLinksTab';
import { QuickActionsTab } from './QuickActionsTab';
import { AnalyticsTab } from './AnalyticsTab';
import { SettingsTab } from './SettingsTab';

type TabId =
  | 'overview'
  | 'ai-training'
  | 'knowledge'
  | 'customers'
  | 'conversations'
  | 'images'
  | 'social'
  | 'quick-actions'
  | 'analytics'
  | 'settings';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const tabs: Tab[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-5 h-5" />, component: <OverviewTab /> },
    { id: 'ai-training', label: 'AI Training', icon: <Brain className="w-5 h-5" />, component: <AITrainingTab /> },
    { id: 'knowledge', label: 'Knowledge Base', icon: <BookOpen className="w-5 h-5" />, component: <KnowledgeTab /> },
    { id: 'customers', label: 'Customers', icon: <Users className="w-5 h-5" />, component: <CustomersTab /> },
    { id: 'conversations', label: 'Conversations', icon: <MessageSquare className="w-5 h-5" />, component: <ConversationsTab /> },
    { id: 'images', label: 'Image Gallery', icon: <Image className="w-5 h-5" />, component: <ImagesTab /> },
    { id: 'social', label: 'Social Links', icon: <Share2 className="w-5 h-5" />, component: <SocialLinksTab /> },
    { id: 'quick-actions', label: 'Quick Actions', icon: <Zap className="w-5 h-5" />, component: <QuickActionsTab /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-5 h-5" />, component: <AnalyticsTab /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" />, component: <SettingsTab /> },
  ];

  const activeTabData = tabs.find((t) => t.id === activeTab);

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-sporting-navy text-white transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sporting-gold flex items-center justify-center">
              <span className="text-xl">&#127754;</span>
            </div>
            <div>
              <h1 className="font-semibold text-sm">Sporting Club</h1>
              <p className="text-xs text-white/60">Admin Dashboard</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 hover:bg-white/10 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {tabs.map((tab) => (
              <li key={tab.id}>
                <button
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSidebarOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    activeTab === tab.id
                      ? 'bg-white/20 text-white'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  )}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* User info */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-sporting-gold/20 flex items-center justify-center">
              <span className="text-lg font-semibold text-sporting-gold">
                {user?.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.email}</p>
              <p className="text-xs text-white/60 capitalize">{user?.role || 'Admin'}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between h-16 px-4 lg:px-6 border-b border-border bg-white">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-secondary rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-semibold text-foreground">
              {activeTabData?.label}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/"
              target="_blank"
              className="px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
            >
              View Chat
            </a>
          </div>
        </header>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          {activeTabData?.component}
        </div>
      </main>
    </div>
  );
}
