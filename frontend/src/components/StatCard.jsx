import React from 'react';

export default function StatCard({ title, value, subtitle, icon: Icon, badge, glowColor = 'sky' }) {
  const glowClasses = {
    sky: 'from-sky-500/10 to-transparent border-sky-500/20 text-sky-400',
    emerald: 'from-emerald-500/10 to-transparent border-emerald-500/20 text-emerald-400',
    violet: 'from-violet-500/10 to-transparent border-violet-500/20 text-violet-400',
    amber: 'from-amber-500/10 to-transparent border-amber-500/20 text-amber-400',
    rose: 'from-rose-500/10 to-transparent border-rose-500/20 text-rose-400',
  };

  const activeGlow = glowClasses[glowColor] || glowClasses.sky;

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br bg-slate-900/80 backdrop-blur-md border rounded-2xl p-5 shadow-xl hover:shadow-sky-500/5 hover:border-slate-700/80 transition-all duration-300 group ${activeGlow.split(' ')[2]}`}>
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${activeGlow.split(' ')[0]} ${activeGlow.split(' ')[1]} blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500`} />
      
      <div className="flex items-center justify-between relative z-10">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{title}</span>
        {Icon && (
          <div className={`p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 ${activeGlow.split(' ')[3]} shadow-inner group-hover:scale-110 transition-transform duration-300`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="mt-4 flex items-baseline justify-between relative z-10">
        <span className="text-3xl font-black text-white tracking-tight font-mono">{value ?? 0}</span>
        {badge && (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-800 text-slate-300 border border-slate-700/60">
            {badge}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="mt-2 text-xs text-slate-400 font-medium flex items-center gap-1.5 relative z-10">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-600 group-hover:bg-sky-400 transition-colors" />
          {subtitle}
        </p>
      )}
    </div>
  );
}

