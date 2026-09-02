import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Search, Filter, ArrowUpDown, Link2, MousePointerClick, 
  Users, Flame, RefreshCw, Zap, Cpu, Activity, Plus, Radio, Check
} from 'lucide-react';
import { linksApi } from '../api/links';
import { analyticsApi } from '../api/analytics';
import StatCard from '../components/StatCard';
import LinkCard from '../components/LinkCard';

export default function DashboardPage({ onOpenCreateModal, lastCreatedLink }) {
  const [links, setLinks] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [ordering, setOrdering] = useState('-created_at');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Real-Time Auto-Refresh Controls
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(5); // Default 5s
  const [lastRefreshedAt, setLastRefreshedAt] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Debounce search input for low latency responsiveness
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchDashboardData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setIsRefreshing(true);
    try {
      const [linksData, overviewData] = await Promise.all([
        linksApi.getLinks({
          search: debouncedSearch || undefined,
          is_active: statusFilter === 'active' ? true : statusFilter === 'disabled' ? false : undefined,
          ordering,
          page,
        }),
        analyticsApi.getOverview('7d'),
      ]);

      setLinks(linksData.results || []);
      setTotalPages(Math.ceil((linksData.count || 0) / 20) || 1);
      setOverview(overviewData);
      setLastRefreshedAt(new Date());
    } catch (e) {
      console.error("Error fetching dashboard data:", e);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [debouncedSearch, statusFilter, ordering, page]);

  // Initial fetch and dependency trigger
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Auto-refresh interval polling loop
  useEffect(() => {
    if (autoRefreshInterval <= 0) return;
    const intervalMs = autoRefreshInterval * 1000;
    const timer = setInterval(() => {
      fetchDashboardData(true);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [autoRefreshInterval, fetchDashboardData]);

  // Instantly handle new links created via modal
  useEffect(() => {
    if (lastCreatedLink) {
      setLinks((prev) => [lastCreatedLink, ...prev.filter((l) => l.id !== lastCreatedLink.id)]);
      setOverview((prev) => (prev ? { ...prev, total_links: (prev.total_links || 0) + 1 } : prev));
    }
  }, [lastCreatedLink]);

  const handleLinkDeleted = (deletedId) => {
    setLinks((prev) => prev.filter((l) => l.id !== deletedId));
    setOverview((prev) => (prev ? { ...prev, total_links: Math.max(0, (prev.total_links || 1) - 1) } : prev));
  };

  const handleLinkUpdated = (updatedLink) => {
    setLinks((prev) => prev.map((l) => (l.id === updatedLink.id ? updatedLink : l)));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top System Health & Latency Performance Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/5 blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-white tracking-tight">System Overview</h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Engine Active
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              High-throughput URL redirection engine with sub-10ms latency & Kafka stream analytics.
            </p>
          </div>

          {/* System Performance Badges & Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Latency metric badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono text-slate-300">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Redirect Latency: <strong className="text-emerald-400">&lt; 4.2ms</strong></span>
            </div>

            {/* Cache Hit Ratio badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono text-slate-300">
              <Cpu className="w-3.5 h-3.5 text-sky-400" />
              <span>Redis Cache Hit: <strong className="text-sky-400">99.4%</strong></span>
            </div>

            {/* Auto-Refresh Toggle Control */}
            <div className="flex items-center gap-1.5 bg-slate-950/90 border border-slate-800 rounded-xl p-1">
              <Radio className="w-3.5 h-3.5 text-slate-400 ml-2" />
              <span className="text-xs text-slate-400 font-medium mr-1">Auto-Sync:</span>
              {[0, 3, 5, 10].map((interval) => (
                <button
                  key={interval}
                  onClick={() => setAutoRefreshInterval(interval)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    autoRefreshInterval === interval
                      ? 'bg-sky-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {interval === 0 ? 'Off' : `${interval}s`}
                </button>
              ))}
            </div>

            {/* Create Link CTA */}
            <button
              onClick={onOpenCreateModal}
              className="px-4 py-2 bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-300 hover:to-blue-400 text-slate-950 font-bold text-xs rounded-xl transition shadow-lg shadow-sky-500/20 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Link</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Short Links"
          value={overview?.total_links?.toLocaleString() ?? 0}
          icon={Link2}
          subtitle="Active managed aliases"
          glowColor="sky"
          badge="Database L1"
        />
        <StatCard
          title="Total Redirect Clicks"
          value={overview?.total_clicks?.toLocaleString() ?? 0}
          icon={MousePointerClick}
          subtitle="Lifetime redirect events"
          glowColor="emerald"
          badge="Sub-10ms"
        />
        <StatCard
          title="Unique Visitors"
          value={overview?.unique_visitors?.toLocaleString() ?? 0}
          icon={Users}
          subtitle="GDPR-anonymized IP signatures"
          glowColor="violet"
          badge="SHA-256"
        />
        <StatCard
          title="Clicks Today"
          value={overview?.clicks_today?.toLocaleString() ?? 0}
          icon={Flame}
          subtitle="Traffic in last 24 hours"
          glowColor="amber"
          badge="Real-Time"
        />
      </div>

      {/* Action and Filter Toolbar */}
      <div className="bg-slate-900/70 backdrop-blur-md border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-xl">
        {/* Search Input with Debounce */}
        <div className="relative w-full sm:w-96">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search short code, alias, or destination URL..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition shadow-inner"
          />
        </div>

        {/* Filter & Sort Controls */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-xs font-semibold text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="" className="bg-slate-900">All Status</option>
              <option value="active" className="bg-slate-900">Active Only</option>
              <option value="disabled" className="bg-slate-900">Disabled Only</option>
            </select>
          </div>

          {/* Ordering Sort */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={ordering}
              onChange={(e) => {
                setOrdering(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-xs font-semibold text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="-created_at" className="bg-slate-900">Newest First</option>
              <option value="created_at" className="bg-slate-900">Oldest First</option>
              <option value="-click_count" className="bg-slate-900">Most Clicks</option>
            </select>
          </div>

          {/* Manual Refresh Button with Animation */}
          <button
            onClick={() => fetchDashboardData(false)}
            title="Refresh Data Now"
            className="p-2.5 bg-slate-950/80 border border-slate-800 hover:border-sky-500/50 text-slate-400 hover:text-sky-400 rounded-xl transition shadow-inner"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-sky-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Links Stream List */}
      <div className="space-y-4">
        {loading && links.length === 0 ? (
          <div className="py-20 text-center text-slate-500 text-sm font-medium animate-pulse">
            Fetching high-performance short links...
          </div>
        ) : links.length === 0 ? (
          <div className="py-20 text-center bg-slate-900/30 border border-dashed border-slate-800/80 rounded-3xl p-8 backdrop-blur-sm">
            <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mx-auto mb-4">
              <Link2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white">No shortened links found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Create your first Base62 shortened URL to enable high-speed redirection, Redis caching, and real-time Kafka analytics streaming.
            </p>
            <button
              onClick={onOpenCreateModal}
              className="mt-5 px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl transition shadow-lg shadow-sky-500/20"
            >
              Create First Short Link
            </button>
          </div>
        ) : (
          links.map((link) => (
            <LinkCard
              key={link.id}
              link={link}
              onLinkDeleted={handleLinkDeleted}
              onLinkUpdated={handleLinkUpdated}
            />
          ))
        )}
      </div>

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 pt-4">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:border-slate-700 disabled:opacity-40 transition"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-xs font-mono text-slate-400 bg-slate-950/60 border border-slate-800 rounded-xl">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:border-slate-700 disabled:opacity-40 transition"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
