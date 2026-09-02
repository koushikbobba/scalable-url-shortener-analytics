import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MousePointerClick, Users, Flame, TrendingUp } from 'lucide-react';
import { analyticsApi } from '../api/analytics';
import StatCard from '../components/StatCard';
import AnalyticsCharts from '../components/AnalyticsCharts';

export default function AnalyticsPage() {
  const { linkId } = useParams();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const data = await analyticsApi.getLinkAnalytics(linkId, timeRange);
        setAnalytics(data);
      } catch (e) {
        console.error('Failed to fetch analytics:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [linkId, timeRange]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center text-slate-500">
        Loading analytics...
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center text-slate-500">
        Analytics data unavailable for this link.
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Link Analytics
            </h1>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              /{analytics.short_code}
              <span className="mx-2 text-slate-600">→</span>
              <span className="text-slate-500 truncate max-w-sm inline-block align-bottom">
                {analytics.original_url}
              </span>
            </p>
          </div>
        </div>

        {/* Time range selector */}
        <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl p-1">
          {['24h', '7d', '30d'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                timeRange === range
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {range === '24h' ? '24 Hours' : range === '7d' ? '7 Days' : '30 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Clicks"
          value={analytics.total_clicks?.toLocaleString()}
          icon={MousePointerClick}
          subtitle="All-time redirect events"
        />
        <StatCard
          title="Unique Visitors"
          value={analytics.unique_visitors?.toLocaleString()}
          icon={Users}
          subtitle="Distinct IP signatures"
        />
        <StatCard
          title="Clicks Today"
          value={analytics.clicks_today?.toLocaleString()}
          icon={Flame}
          subtitle="Last 24 hours"
        />
        <StatCard
          title="This Week"
          value={analytics.clicks_this_week?.toLocaleString()}
          icon={TrendingUp}
          subtitle="Last 7 days"
        />
      </div>

      {/* Charts and Dimension Breakdowns */}
      <AnalyticsCharts analyticsData={analytics} />
    </div>
  );
}
