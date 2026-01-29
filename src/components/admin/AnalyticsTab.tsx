import React, { useEffect, useState } from 'react';
import { MessageSquare, Users, ThumbsUp, TrendingUp, Calendar, Star } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

interface Analytics {
  totalConversations: number;
  totalMessages: number;
  totalCustomers: number;
  avgRating: number;
  positiveRatings: number;
  negativeRatings: number;
  conversationsToday: number;
  conversationsThisWeek: number;
}

export function AnalyticsTab() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [topQuestions, setTopQuestions] = useState<{ question: string; count: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [
        convRes,
        msgRes,
        custRes,
        ratingsRes,
        todayRes,
        weekRes,
      ] = await Promise.all([
        supabase.from('conversations').select('id', { count: 'exact', head: true }),
        supabase.from('chat_messages').select('id', { count: 'exact', head: true }),
        supabase.from('customers').select('id', { count: 'exact', head: true }),
        supabase.from('message_ratings').select('rating'),
        supabase.from('conversations').select('id', { count: 'exact', head: true }).gte('started_at', startOfDay),
        supabase.from('conversations').select('id', { count: 'exact', head: true }).gte('started_at', startOfWeek),
      ]);

      const ratings = ratingsRes.data || [];
      const positiveRatings = ratings.filter((r) => r.rating === 5).length;
      const negativeRatings = ratings.filter((r) => r.rating === 1).length;
      const avgRating = ratings.length > 0
        ? ratings.reduce((acc, r) => acc + r.rating, 0) / ratings.length
        : 0;

      setAnalytics({
        totalConversations: convRes.count || 0,
        totalMessages: msgRes.count || 0,
        totalCustomers: custRes.count || 0,
        avgRating,
        positiveRatings,
        negativeRatings,
        conversationsToday: todayRes.count || 0,
        conversationsThisWeek: weekRes.count || 0,
      });

      // Get top questions (sample - would need proper query for production)
      const { data: msgData } = await supabase
        .from('chat_messages')
        .select('content')
        .eq('role', 'user')
        .limit(100);

      if (msgData) {
        const questionCounts: Record<string, number> = {};
        msgData.forEach((m) => {
          if (m.content.includes('?')) {
            const q = m.content.toLowerCase().trim();
            questionCounts[q] = (questionCounts[q] || 0) + 1;
          }
        });

        const sorted = Object.entries(questionCounts)
          .map(([question, count]) => ({ question, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        setTopQuestions(sorted);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!analytics) {
    return <div className="text-center text-muted-foreground">Failed to load analytics</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Conversations" value={analytics.totalConversations} icon={<MessageSquare className="w-6 h-6" />} color="bg-blue-500" />
        <StatCard title="Total Messages" value={analytics.totalMessages} icon={<MessageSquare className="w-6 h-6" />} color="bg-purple-500" />
        <StatCard title="Total Customers" value={analytics.totalCustomers} icon={<Users className="w-6 h-6" />} color="bg-green-500" />
        <StatCard
          title="Average Rating"
          value={analytics.avgRating > 0 ? `${analytics.avgRating.toFixed(1)}/5` : 'N/A'}
          icon={<Star className="w-6 h-6" />}
          color="bg-yellow-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Activity
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Conversations Today</span>
              <span className="font-semibold">{analytics.conversationsToday}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Conversations This Week</span>
              <span className="font-semibold">{analytics.conversationsThisWeek}</span>
            </div>
          </div>
        </div>

        {/* Ratings */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <ThumbsUp className="w-5 h-5" />
            Feedback
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-sm text-green-700">Positive Ratings</span>
              <span className="font-semibold text-green-700">{analytics.positiveRatings}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <span className="text-sm text-red-700">Negative Ratings</span>
              <span className="font-semibold text-red-700">{analytics.negativeRatings}</span>
            </div>
            {analytics.positiveRatings + analytics.negativeRatings > 0 && (
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500"
                  style={{
                    width: `${(analytics.positiveRatings / (analytics.positiveRatings + analytics.negativeRatings)) * 100}%`,
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Questions */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Frequently Asked Questions
        </h3>
        {topQuestions.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">Not enough data yet</p>
        ) : (
          <ul className="space-y-2">
            {topQuestions.map((q, i) => (
              <li key={i} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                <span className="text-sm truncate flex-1 mr-4">{q.question}</span>
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                  {q.count}x
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <div className="card p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
        </div>
        <div className={cn('p-3 rounded-lg text-white', color)}>{icon}</div>
      </div>
    </div>
  );
}
