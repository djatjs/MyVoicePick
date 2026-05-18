// CoreInsights.tsx
import React from 'react';
interface VocalStats {
  warmth: number;
  clarity: number;
  power: number;
  rhythm: number;
  emotion: number;
}

interface Props {
  latestAnalysis: {
    vocalPersona?: string;
    vocalStats?: VocalStats;
  } | null;
  statLabels: Record<string, string>;
}

export default function CoreInsights({ latestAnalysis, statLabels }: Props) {
  return (
    <div className="flex-1 space-y-10 relative z-10">
      <div className="space-y-2">
        <h3 className="text-xs font-black text-emerald-400 uppercase tracking-[0.4em] mb-4">Latest AI Vocal Profile</h3>
        <div className="text-4xl md:text-5xl font-black text-white tracking-tighter leading-tight break-keep">
          {latestAnalysis?.vocalPersona || "Ready to Start"}
        </div>
      </div>

      {latestAnalysis ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 mt-8">
          {Object.entries(latestAnalysis.vocalStats || {}).map(([key, val]) => (
            <div key={key} className="space-y-3 group/stat">
              <div className="flex justify-between items-end">
                <span className="text-xs font-black text-white/50 uppercase tracking-widest group-hover/stat:text-white/80 transition-colors">
                  {statLabels[key as keyof typeof statLabels] || key}
                </span>
                <span className="text-sm font-black text-white drop-shadow-md">{val}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-900/50 rounded-full overflow-hidden border border-slate-700/50">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 via-emerald-400 to-teal-400 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)] relative"
                  style={{ width: `${val}%` }}
                >
                  <div className="absolute top-0 right-0 bottom-0 w-4 bg-white/40 blur-sm" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-16 bg-slate-900/40 border border-dashed border-slate-700/50 rounded-3xl flex flex-col items-center justify-center text-center px-6 mt-8">
          <p className="text-white/30 font-black uppercase tracking-widest mb-4 break-keep">No DNA Data Detected</p>
          <a href="/analyze" className="text-xs font-black text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-2 transition-colors">
            Start Your First Session &rarr;
          </a>
        </div>
      )}
    </div>
  );
}
