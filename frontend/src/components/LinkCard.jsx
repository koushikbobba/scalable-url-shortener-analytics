import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Check, BarChart2, ExternalLink, Trash2, Power, Clock, Zap } from 'lucide-react';
import { linksApi } from '../api/links';

export default function LinkCard({ link, onLinkDeleted, onLinkUpdated }) {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const fullShortUrl = link.short_url || `http://localhost:8000/${link.short_code}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullShortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleActive = async () => {
    setLoading(true);
    try {
      const updated = await linksApi.updateLink(link.id, { is_active: !link.is_active });
      onLinkUpdated(updated);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete short link '${link.short_code}'?`)) return;
    setLoading(true);
    try {
      await linksApi.deleteLink(link.id);
      onLinkDeleted(link.id);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`p-5 rounded-2xl border backdrop-blur-md transition-all duration-300 ${
      link.is_active
        ? 'bg-slate-900/80 border-slate-800/90 hover:border-sky-500/40 hover:shadow-xl hover:shadow-sky-500/5'
        : 'bg-slate-900/30 border-slate-900/60 opacity-60'
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          {/* Header row: Full Short URL & Status Badge */}
          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href={fullShortUrl}
              target="_blank"
              rel="noreferrer"
              className="text-base font-extrabold font-mono text-sky-400 hover:text-sky-300 flex items-center gap-1.5 truncate group"
            >
              <span className="truncate">{fullShortUrl}</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform flex-shrink-0" />
            </a>

            {link.is_expired ? (
              <span className="px-2.5 py-0.5 text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-full uppercase tracking-wider">
                Expired
              </span>
            ) : !link.is_active ? (
              <span className="px-2.5 py-0.5 text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700/80 rounded-full uppercase tracking-wider">
                Disabled
              </span>
            ) : (
              <span className="px-2.5 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active
              </span>
            )}
          </div>

          {/* Destination URL */}
          <p className="text-xs text-slate-400 truncate max-w-xl font-medium" title={link.original_url}>
            <span className="text-slate-600 font-mono mr-1">→</span>
            {link.original_url}
          </p>

          {/* Badges & Telemetry Row */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-medium pt-1">
            <span className="flex items-center gap-1 text-slate-400">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              {new Date(link.created_at).toLocaleDateString()}
            </span>
            <span className="text-slate-700">•</span>
            <span className="flex items-center gap-1 text-sky-400 font-bold font-mono">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              {link.click_count.toLocaleString()} clicks
            </span>
            <span className="text-slate-700">•</span>
            <span className="px-2 py-0.5 rounded-md bg-slate-950 text-[10px] font-mono text-slate-400 border border-slate-800">
              Redis L1 Cache
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0 pt-2 sm:pt-0">
          <button
            onClick={handleCopy}
            title="Copy Short URL"
            className={`p-2.5 rounded-xl transition border text-xs font-semibold flex items-center gap-1.5 ${
              copied
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy</span>
              </>
            )}
          </button>

          <Link
            to={`/analytics/${link.id}`}
            title="View Real-Time Analytics"
            className="p-2.5 rounded-xl bg-slate-950 hover:bg-sky-500/10 text-sky-400 hover:text-sky-300 border border-slate-800 hover:border-sky-500/30 transition flex items-center gap-1.5 text-xs font-semibold"
          >
            <BarChart2 className="w-4 h-4" />
            <span>Analytics</span>
          </Link>

          <button
            onClick={handleToggleActive}
            disabled={loading}
            title={link.is_active ? "Disable link" : "Enable link"}
            className={`p-2.5 rounded-xl border transition ${
              link.is_active
                ? 'bg-slate-950 hover:bg-amber-500/10 text-slate-400 hover:text-amber-400 border-slate-800 hover:border-amber-500/30'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}
          >
            <Power className="w-4 h-4" />
          </button>

          <button
            onClick={handleDelete}
            disabled={loading}
            title="Delete link"
            className="p-2.5 rounded-xl bg-slate-950 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-500/30 transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
