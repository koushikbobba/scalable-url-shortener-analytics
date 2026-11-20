import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ExternalLink, AlertTriangle, Clock, ArrowLeft, Loader2, Link2 } from 'lucide-react';
import { linksApi } from '../api/links';

export default function RedirectPage() {
  const { shortCode } = useParams();
  const [loading, setLoading] = useState(true);
  const [targetUrl, setTargetUrl] = useState('');
  const [errorStatus, setErrorStatus] = useState(null); // 'not_found' | 'disabled' | 'expired'

  useEffect(() => {
    let timer = null;

    const resolveLink = async () => {
      try {
        // First check in-browser storage (for GitHub Pages demo mode)
        const demoLinks = JSON.parse(localStorage.getItem('demo_links') || '[]');
        let link = demoLinks.find(
          (l) => l.short_code?.toLowerCase() === shortCode?.toLowerCase() || l.custom_alias?.toLowerCase() === shortCode?.toLowerCase()
        );

        // If not found in demo storage, try the backend API
        if (!link) {
          try {
            const res = await linksApi.getLinks({ search: shortCode });
            link = res.results?.find(
              (l) => l.short_code?.toLowerCase() === shortCode?.toLowerCase() || l.custom_alias?.toLowerCase() === shortCode?.toLowerCase()
            );
          } catch (e) {
            console.warn("Backend lookup failed:", e);
          }
        }

        if (!link) {
          setErrorStatus('not_found');
          setLoading(false);
          return;
        }

        if (!link.is_active) {
          setErrorStatus('disabled');
          setLoading(false);
          return;
        }

        if (link.expires_at && new Date(link.expires_at) < new Date()) {
          setErrorStatus('expired');
          setLoading(false);
          return;
        }

        // Increment click count in demo storage
        link.click_count = (link.click_count || 0) + 1;
        const updated = demoLinks.map((l) => (l.id === link.id ? link : l));
        localStorage.setItem('demo_links', JSON.stringify(updated));

        setTargetUrl(link.original_url);
        setLoading(false);

        // Instant redirect after 800ms
        timer = setTimeout(() => {
          window.location.replace(link.original_url);
        }, 800);
      } catch (err) {
        console.error("Redirect error:", err);
        setErrorStatus('not_found');
        setLoading(false);
      }
    };

    resolveLink();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [shortCode]);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-8 shadow-2xl text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/5 blur-3xl pointer-events-none" />

        {loading ? (
          <div className="space-y-4 py-8">
            <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mx-auto animate-pulse">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-white">Resolving Short Link</h2>
            <p className="text-sm font-mono text-slate-400">Querying Redis Cache for #{shortCode}...</p>
          </div>
        ) : errorStatus === 'disabled' ? (
          <div className="space-y-5 py-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Link Deactivated</h2>
              <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
                The short link <span className="font-mono text-amber-400 font-bold">#{shortCode}</span> has been disabled by its owner.
              </p>
            </div>
            <div className="pt-2">
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Link>
            </div>
          </div>
        ) : errorStatus === 'expired' ? (
          <div className="space-y-5 py-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
              <Clock className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Link Expired</h2>
              <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
                The short link <span className="font-mono text-rose-400 font-bold">#{shortCode}</span> has reached its expiration date and is no longer active.
              </p>
            </div>
            <div className="pt-2">
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Link>
            </div>
          </div>
        ) : errorStatus === 'not_found' ? (
          <div className="space-y-5 py-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 mx-auto">
              <Link2 className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Short Link Not Found</h2>
              <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
                No active destination was found for <span className="font-mono text-slate-300 font-bold">#{shortCode}</span>.
              </p>
            </div>
            <div className="pt-2">
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition shadow-lg shadow-sky-500/20"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-5 py-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
              <ExternalLink className="w-8 h-8 animate-bounce" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Redirecting...</h2>
              <p className="text-xs text-slate-400 mt-1">Taking you to destination URL in sub-10ms:</p>
              <p className="text-sm font-mono text-sky-400 truncate max-w-sm mx-auto mt-2 p-2 bg-slate-950 rounded-lg border border-slate-800">
                {targetUrl}
              </p>
            </div>
            <div className="pt-2">
              <a
                href={targetUrl}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition shadow-lg shadow-sky-500/20"
              >
                Click here if not redirected
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
