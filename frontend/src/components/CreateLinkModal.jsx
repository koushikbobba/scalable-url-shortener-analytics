import React, { useState } from 'react';
import { X, Link as LinkIcon, Sparkles, Calendar, AlertCircle } from 'lucide-react';
import { linksApi } from '../api/links';

export default function CreateLinkModal({ isOpen, onClose, onLinkCreated }) {
  const [originalUrl, setOriginalUrl] = useState('');
  const [customAlias, setCustomAlias] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!originalUrl.trim()) {
      setError('Original destination URL is required.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        original_url: originalUrl.trim(),
        custom_alias: customAlias.trim() || undefined,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      };

      const newLink = await linksApi.createLink(payload);
      onLinkCreated(newLink);
      setOriginalUrl('');
      setCustomAlias('');
      setExpiresAt('');
      onClose();
    } catch (err) {
      const errData = err.response?.data;
      let msg = 'Failed to create short link.';
      if (err.response?.status === 401) {
        msg = 'Your session has expired. Please sign in to create short links.';
      } else if (errData) {
        if (typeof errData === 'string') {
          msg = errData;
        } else if (errData.custom_alias) {
          msg = Array.isArray(errData.custom_alias) ? errData.custom_alias.join(' ') : String(errData.custom_alias);
        } else if (errData.original_url) {
          msg = Array.isArray(errData.original_url) ? errData.original_url.join(' ') : String(errData.original_url);
        } else if (errData.detail) {
          msg = errData.detail;
        } else if (errData.error?.message) {
          msg = errData.error.message;
        }
      }
      setError(msg);
    } finally {
      setLoading(false);
    }

  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Create Short Link</h2>
            <p className="text-xs text-slate-400">Generate a high-performance redirect alias</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-rose-400 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Destination URL <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <LinkIcon className="w-4 h-4" />
              </div>
              <input
                type="url"
                required
                placeholder="https://example.com/very/long/destination/url"
                value={originalUrl}
                onChange={(e) => setOriginalUrl(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Custom Alias <span className="text-slate-500">(Optional)</span>
            </label>
            <div className="flex rounded-lg overflow-hidden border border-slate-800 focus-within:border-sky-500 transition">
              <span className="bg-slate-950 px-3 py-2 text-xs text-slate-500 border-r border-slate-800 flex items-center font-mono select-none">
                link.io/
              </span>
              <input
                type="text"
                placeholder="my-portfolio"
                value={customAlias}
                onChange={(e) => setCustomAlias(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 text-sm text-white placeholder-slate-500 focus:outline-none"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Leave empty for auto-generated 7-character Base62 code.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Expiration Date <span className="text-slate-500">(Optional)</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Calendar className="w-4 h-4" />
              </div>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-lg text-sm font-semibold bg-sky-500 hover:bg-sky-400 text-slate-950 transition disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Short Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
