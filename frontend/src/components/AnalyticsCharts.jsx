import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';

export default function AnalyticsCharts({ analyticsData }) {
  if (!analyticsData) return null;

  const { clicks_over_time = [], top_countries = [], top_devices = [], top_browsers = [], top_referrers = [] } = analyticsData;

  return (
    <div className="space-y-6">
      {/* Clicks Over Time Area Chart */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white">Click Traffic Trend</h3>
            <p className="text-xs text-slate-400">Total clicks and unique visitors over time</p>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={clicks_over_time} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="clicksGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="uvGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="timestamp" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
              />
              <Area type="monotone" dataKey="clicks" stroke="#0ea5e9" strokeWidth={2} fillOpacity={1} fill="url(#clicksGrad)" name="Clicks" />
              <Area type="monotone" dataKey="unique_visitors" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#uvGrad)" name="Unique Visitors" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid of Dimension Breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Countries */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <h4 className="text-sm font-bold text-white mb-4">Top Countries</h4>
          <div className="space-y-3">
            {top_countries.length > 0 ? (
              top_countries.map((c, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium text-slate-300">
                    <span>{c.name}</span>
                    <span>{c.count} clicks ({c.percentage}%)</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-sky-500 h-full rounded-full transition-all duration-500" style={{ width: `${c.percentage}%` }} />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 italic">No geographic data recorded yet.</p>
            )}
          </div>
        </div>

        {/* Top Devices */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <h4 className="text-sm font-bold text-white mb-4">Device Distribution</h4>
          <div className="space-y-3">
            {top_devices.length > 0 ? (
              top_devices.map((d, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium text-slate-300">
                    <span>{d.name}</span>
                    <span>{d.count} clicks ({d.percentage}%)</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${d.percentage}%` }} />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 italic">No device data recorded yet.</p>
            )}
          </div>
        </div>

        {/* Top Browsers */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <h4 className="text-sm font-bold text-white mb-4">Top Browsers</h4>
          <div className="space-y-3">
            {top_browsers.length > 0 ? (
              top_browsers.map((b, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium text-slate-300">
                    <span>{b.name}</span>
                    <span>{b.count} clicks ({b.percentage}%)</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${b.percentage}%` }} />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 italic">No browser data recorded yet.</p>
            )}
          </div>
        </div>

        {/* Top Referrers */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <h4 className="text-sm font-bold text-white mb-4">Top Referrers</h4>
          <div className="space-y-3">
            {top_referrers.length > 0 ? (
              top_referrers.map((r, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium text-slate-300">
                    <span className="truncate max-w-[200px]" title={r.name}>{r.name}</span>
                    <span>{r.count} ({r.percentage}%)</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-purple-500 h-full rounded-full transition-all duration-500" style={{ width: `${r.percentage}%` }} />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 italic">No referrer data recorded yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
