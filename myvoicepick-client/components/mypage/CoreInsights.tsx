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

/**
 * 핵심 인사이트 컴포넌트
 * - 현재 보컬 페르소나와 각 보컬 스코어를 보여줍니다.
 * - 최신 분석이 없을 경우 안내 문구를 표시합니다.
 */
export default function CoreInsights({ latestAnalysis, statLabels }: Props) {
  return (
    <div className="lg:col-span-8 mvp-glass-card p-12 relative overflow-hidden flex flex-col md:flex-row gap-12 group">
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px] -mr-48 -mt-48 group-hover:bg-indigo-500/10 transition-all duration-700" />

      {/* Left side: Persona Info */}
      <div className="flex-1 space-y-10 relative z-10">
        <div className="space-y-2">
          <h3 className="text-xs font-black text-emerald-400 uppercase tracking-[0.4em]">Current Identity</h3>
          <div className="text-5xl font-black text-white tracking-tighter leading-none break-keep">
            {latestAnalysis?.vocalPersona || "Ready to Start"}
          </div>
        </div>

        {latestAnalysis ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
            {Object.entries(latestAnalysis.vocalStats || {}).map(([key, val]) => (
              <div key={key} className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-[11px] font-black text-white/40 uppercase tracking-widest">
                    {statLabels[key as keyof typeof statLabels] || key}
                  </span>
                  <span className="text-sm font-black text-white">{val}%</span>
                </div>
                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-right from-emerald-500 to-teal-400 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                    style={{ width: `${val}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 bg-white/[0.02] border border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center text-center px-6">
            <p className="text-white/20 font-black uppercase tracking-widest mb-4 break-keep">No DNA Data Detected</p>
            <a href="/analyze" className="text-xs font-bold text-indigo-400 hover:underline">
              Start Your First Session &rarr;
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
