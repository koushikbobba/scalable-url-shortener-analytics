import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Link2, BarChart2, LogOut, PlusCircle, Activity } from 'lucide-react';

export default function Navbar({ user, onLogout, onOpenCreateModal }) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2 text-sky-400 font-bold text-xl tracking-tight">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Link2 className="w-5 h-5" />
          </div>
          <span>Link<span className="text-white">Stream</span></span>
          <span className="text-xs uppercase px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono">
            v1.0
          </span>
        </Link>

        {/* Navigation items */}
        {user ? (
          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-lg border border-slate-800">
              <Link
                to="/"
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  isActive('/') ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Activity className="w-4 h-4" />
                Dashboard
              </Link>
            </nav>

            <button
              onClick={onOpenCreateModal}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-sm transition shadow-sm shadow-sky-500/20"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Shorten URL</span>
            </button>

            <div className="h-6 w-px bg-slate-800" />

            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-400 hidden sm:inline">{user.email}</span>
              <button
                onClick={onLogout}
                title="Logout"
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="px-3.5 py-1.5 text-sm font-medium text-slate-300 hover:text-white transition"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-3.5 py-1.5 text-sm font-medium bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold rounded-lg transition shadow-sm shadow-sky-500/20"
            >
              Get Started
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
