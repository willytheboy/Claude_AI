import React, { useEffect, useState } from 'react';
import {
  MessageSquare,
  Users,
  Star,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn, formatRelativeTime } from '../../lib/utils';
import type { AdminAlert, Conversation } from '../../types';

interface Stats {
  totalConversations: number;
  totalCustomers: number;
  averageRating: number;
  pendingAlerts: number;
}

export function OverviewTab() {
  const [stats, setStats] = useState<Stats>({
    totalConversations: 0,
    totalCustomers: 0,
    averageRating: 0,
    pendingAlerts: 0,
  });
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [recentConversations, setRecentConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        // Load stats
        const [conversationsRes, customersRes, ratingsRes, alertsRes] = await Promise.all([
          supabase.from('conversations').select('id', { count: 'exact', head: true }),
          supabase.from('customers').select('id', { count: 'exact', head: true }),
          supabase.from('message_ratings').select('rating'),
          supabase.from('admin_alerts').select('*').eq('is_resolved', false).order('created_at', { ascending: false }).limit(5),
        ]);

        // Calculate average rating
        let avgRating = 0;
        if (ratingsRes.data && ratingsRes.data.length > 0) {
          const sum = ratingsRes.data.reduce((acc, r) => acc + r.rating, 0);
          avgRating = sum / ratingsRes.data.length;
        }

        setStats({
          totalConversations: conversationsRes.count || 0,
          totalCustomers: customersRes.count || 0,
          averageRating: avgRating,
          pendingAlerts: alertsRes.data?.length || 0,
        });

        setAlerts(alertsRes.data as AdminAlert[] || []);

        // Load recent conversations
        const { data: convData } = await supabase
          .from('conversations')
          .select('*')
          .order('last_message_at', { ascending: false })
          .limit(5);

        setRecentConversations(convData as Conversation[] || []);
      } catch (error) {
        console.error('Error loading overview data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  const handleResolveAlert = async (alertId: string) => {
    try {
      await supabase
        .from('admin_alerts')
        .update({ is_resolved: true, resolved_at: new Date().toISOString() })
        .eq('id', alertId);

      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      setStats((prev) => ({ ...prev, pendingAlerts: prev.pendingAlerts - 1 }));
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Conversations"
          value={stats.totalConversations}
          icon={<MessageSquare className="w-6 h-6" />}
          color="bg-blue-500"
        />
        <StatCard
          title="Total Customers"
          value={stats.totalCustomers}
          icon={<Users className="w-6 h-6" />}
          color="bg-green-500"
        />
        <StatCard
          title="Average Rating"
          value={stats.averageRating > 0 ? `${stats.averageRating.toFixed(1)}/5` : 'N/A'}
          icon={<Star className="w-6 h-6" />}
          color="bg-yellow-500"
        />
        <StatCard
          title="Pending Alerts"
          value={stats.pendingAlerts}
          icon={<AlertTriangle className="w-6 h-6" />}
          color={stats.pendingAlerts > 0 ? 'bg-red-500' : 'bg-gray-400'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Alerts */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Pending Alerts
          </h3>
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
              <p>No pending alerts</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {alerts.map((alert) => (
                <li
                  key={alert.id}
                  className={cn(
                    'flex items-start justify-between p-3 rounded-lg border',
                    alert.severity === 'high'
                      ? 'bg-red-50 border-red-200'
                      : alert.severity === 'medium'
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-gray-50 border-gray-200'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{alert.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatRelativeTime(alert.created_at)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleResolveAlert(alert.id)}
                    className="ml-3 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/10 rounded transition-colors"
                  >
                    Resolve
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent Conversations */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            Recent Conversations
          </h3>
          {recentConversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No conversations yet</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {recentConversations.map((conv) => (
                <li
                  key={conv.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {conv.session_id.slice(0, 12)}...
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeTime(conv.last_message_at)}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  trend?: number;
}

function StatCard({ title, value, icon, color, trend }: StatCardProps) {
  return (
    <div className="card p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
          {trend !== undefined && (
            <p className={cn('text-sm mt-1 flex items-center gap-1', trend >= 0 ? 'text-green-600' : 'text-red-600')}>
              <TrendingUp className={cn('w-4 h-4', trend < 0 && 'rotate-180')} />
              {Math.abs(trend)}% from last week
            </p>
          )}
        </div>
        <div className={cn('p-3 rounded-lg text-white', color)}>{icon}</div>
      </div>
    </div>
  );
}
