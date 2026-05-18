// ProInsights.tsx
import React from 'react';
import { ShieldCheck, Music, Zap } from 'lucide-react';
import { MvpButton } from '../../components/mvp/MvpButton';
import Link from 'next/link';

interface Props {
  latestAnalysis: {
    taskId: string;
    similarityScore?: number;
    matchedSongTitle?: string;
    matchedArtist?: string;
    proFeatures?: {
      key?: string;
      guide?: string;
    };
  } | null;
  userPlan: string;
}

/**
 * PRO 사용자용 인사이트 패널
 * - 매치 스코어, 추천 트랙, PRO 전용 키/가이드 등을 표시합니다.
 * - FREE 사용자는 잠금 표시와 업그레이드 배너를 보여줍니다.
 */
export default function ProInsights({ latestAnalysis, userPlan }: Props) {
  return (
    <div className="flex flex-col h-full p-8 bg-gradient-to-b from-slate-800/40 to-transparent rounded-[32px] border border-white/10 relative z-10 shadow-2xl backdrop-blur-xl">
      <div className="space-y-6 flex-1">
        <div className="flex items-center justify-between">
          <div className="w-12 h-12 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-400 border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.3)]">
            <Music className="w-6 h-6" />
          </div>
          {latestAnalysis && (
            <div className="px-3 py-1.5 bg-white/5 rounded-full text-[10px] font-black text-white/60 uppercase tracking-widest border border-white/5 shadow-inner">
              Match <span className="text-emerald-400 ml-1">{latestAnalysis.similarityScore || 0}%</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Recommended Track</p>
          <p className="text-2xl font-black text-white leading-tight truncate drop-shadow-md">
            {latestAnalysis?.matchedSongTitle || "Ready to match"}
          </p>
          <p className="text-sm font-bold text-white/40">
            {latestAnalysis?.matchedArtist || "Artist Name"}
          </p>
        </div>

        {/* PRO Insights Preview */}
        <div className="pt-6 border-t border-white/10 space-y-4">
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
            <span className="text-white/60">Pro Insights</span>
            {userPlan === 'FREE' && <ShieldCheck className="w-4 h-4 text-amber-500 animate-pulse" />}
          </div>

          <div className="space-y-3">
            {/* Key Recommendation */}
            <div className="flex items-center justify-between p-4 bg-slate-900/60 rounded-2xl border border-slate-700/50 shadow-inner">
              <span className="text-[10px] font-bold text-white/50">Recommended Key</span>
              <span className={`text-xs font-black ${userPlan === 'PRO' ? 'text-indigo-400' : 'text-white/20'}`}>
                {userPlan === 'PRO' ? (latestAnalysis?.proFeatures?.key || 'Calculating...') : 'Locked'}
              </span>
            </div>
            {/* Practice Guide Preview */}
            <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-700/50 shadow-inner">
              <p className="text-[10px] font-bold text-white/50 mb-3 flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-amber-400" /> Vocal Guide
              </p>
              <p className={`text-[11px] leading-relaxed font-medium whitespace-pre-wrap break-keep ${userPlan === 'PRO' ? 'text-white/80' : 'text-white/10 blur-[2px]'}`}>
                {userPlan === 'PRO' ? (latestAnalysis?.proFeatures?.guide || 'Waiting for insights...') : 'Upgrade to Pro to unlock personalized vocal training guides and key recommendations.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {latestAnalysis && (
        <Link href={`/analyze?taskId=${latestAnalysis.taskId}`} className="mt-8 py-4 bg-white text-black rounded-2xl text-[11px] font-black hover:bg-gray-200 text-center transition-all uppercase tracking-widest shadow-[0_0_20px_rgba(255,255,255,0.2)]">
          View Full Report &rarr;
        </Link>
      )}
    </div>
  );
}
