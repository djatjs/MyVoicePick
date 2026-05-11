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
    <div className="md:w-80 flex flex-col p-8 bg-white/[0.03] rounded-[32px] border border-white/5 relative z-10">
      <div className="space-y-6 flex-1">
        <div className="flex items-center justify-between">
          <div className="w-12 h-12 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-400 border border-rose-500/20">
            <Music className="w-6 h-6" />
          </div>
          {latestAnalysis && (
            <div className="px-2 py-1 bg-white/5 rounded-lg text-[9px] font-bold text-white/40 uppercase tracking-tighter">
              Match Score: {latestAnalysis.similarityScore || 0}%
            </div>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Recommended Track</p>
          <p className="text-xl font-black text-white leading-tight truncate">
            {latestAnalysis?.matchedSongTitle || "Ready to match"}
          </p>
          <p className="text-xs font-bold text-white/30">
            {latestAnalysis?.matchedArtist || "Artist Name"}
          </p>
        </div>

        {/* PRO Insights Preview */}
        <div className="pt-6 border-t border-white/5 space-y-4">
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
            <span className="text-white/40">Pro Insights</span>
            {userPlan === 'FREE' && <ShieldCheck className="w-3 h-3 text-amber-500" />}
          </div>

          <div className="space-y-3">
            {/* Key Recommendation */}
            <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl border border-white/5">
              <span className="text-[10px] font-bold text-white/30">Recommended Key</span>
              <span className={`text-[10px] font-black ${userPlan === 'PRO' ? 'text-indigo-400' : 'text-white/10'}`}>
                {userPlan === 'PRO' ? (latestAnalysis?.proFeatures?.key || 'Calculating...') : 'Locked'}
              </span>
            </div>
            {/* Practice Guide Preview */}
            <div className="p-3 bg-white/[0.02] rounded-xl border border-white/5">
              <p className="text-[10px] font-bold text-white/30 mb-2">Vocal Guide</p>
              <p className={`text-[10px] leading-relaxed font-medium whitespace-pre-wrap break-keep ${userPlan === 'PRO' ? 'text-white/60' : 'text-white/5'}`}>
                {userPlan === 'PRO' ? (latestAnalysis?.proFeatures?.guide || 'Waiting for insights...') : 'Upgrade to Pro to unlock personalized vocal training guides and key recommendations.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {latestAnalysis && (
        <Link href={`/analyze?taskId=${latestAnalysis.taskId}`} className="mt-8 py-3 bg-indigo-500 rounded-xl text-[10px] font-black text-white hover:bg-indigo-600 text-center transition-all uppercase tracking-widest shadow-lg shadow-indigo-500/20">
          Full Report →
        </Link>
      )}
    </div>
  );
}
