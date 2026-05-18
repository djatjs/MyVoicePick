// ProfileHeader.tsx
import Link from 'next/link';
import { MvpButton } from './../mvp/MvpButton';
import { Star, Play, Mic2 } from 'lucide-react';

interface Props {
  userEmail: string | null;
  userPlan: string;
}

export default function ProfileHeader({ userEmail, userPlan }: Props) {
  return (
    <section className="relative flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/5 pb-12">
      <div className="absolute top-[-50%] left-[-10%] w-[60%] h-[150%] bg-gradient-to-r from-indigo-500/10 via-fuchsia-500/5 to-transparent blur-[100px] pointer-events-none" />
      
      <div className="relative z-10 flex items-center gap-6 sm:gap-8">
        <div className="hidden sm:flex relative items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-[var(--mvp-radius-lg)] bg-slate-900 border border-slate-700 shadow-[0_0_40px_rgba(99,102,241,0.15)] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20 mix-blend-overlay" />
          <Mic2 className="w-8 h-8 text-white/50" />
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="px-3 py-1 bg-gradient-to-r from-indigo-500/10 to-fuchsia-500/10 border border-indigo-500/20 rounded-full text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
              <Star className="w-3 h-3" /> {userPlan} Member
            </div>
            <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-black text-white/40 uppercase tracking-widest">
              Verified Studio
            </div>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tighter drop-shadow-lg">
            {userEmail?.split('@')[0]}<span className="text-white/20 font-light">.workspace</span>
          </h1>
          <p className="text-white/50 text-sm sm:text-base md:text-lg font-medium max-w-2xl break-keep">
            AI 기반 정밀 분석을 통해 당신만의 <span className="text-indigo-300 font-bold">시그니처 사운드</span>를 완성하고 기록하세요.
          </p>
        </div>
      </div>

      <div className="relative z-10 flex w-full md:w-auto mt-4 md:mt-0">
        <Link href="/analyze" className="w-full md:w-auto">
          <button className="group w-full md:w-auto flex items-center justify-center gap-2 h-14 px-8 rounded-2xl bg-white text-black font-black uppercase tracking-widest hover:bg-gray-200 transition-all shadow-[0_0_30px_rgba(255,255,255,0.15)]">
            <Play className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
            New Session
          </button>
        </Link>
      </div>
    </section>
  );
}
