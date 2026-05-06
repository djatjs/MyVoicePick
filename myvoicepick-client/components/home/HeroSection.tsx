import React from 'react';
import Link from 'next/link';
import { MvpButton } from '../mvp/MvpButton';

export function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center pt-20 overflow-hidden">
      <div className="mvp-container relative z-10 text-center">
        {/* 상단 뱃지 */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10 mb-8 animate-in fade-in slide-in-from-top-4 duration-1000">
           <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
           <span className="text-xs font-bold uppercase tracking-widest text-indigo-300">Vocal Intelligence 2.0</span>
        </div>

        {/* 메인 타이틀 */}
        <h1 className="text-6xl md:text-8xl mvp-display mb-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
           Discover Your <br />
           <span className="mvp-gradient-text">Unique Voice DNA</span>
        </h1>

        {/* 서브 타이틀 */}
        <p className="text-xl md:text-2xl text-[var(--mvp-text-muted)] font-medium max-w-5xl mx-auto mb-12 leading-relaxed break-keep md:whitespace-nowrap animate-in fade-in duration-1000 delay-300">
           AI가 당신의 음색 속에 숨겨진 코드를 분석하고, 가장 빛나는 음악적 동반자를 찾아드립니다.
        </p>

        {/* CTA 버튼 */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 animate-in fade-in duration-1000 delay-500">
           <Link href="/analyze">
             <MvpButton variant="primary" size="lg" className="w-full sm:w-auto text-lg px-8">
               지금 분석 시작하기
             </MvpButton>
           </Link>
           <Link href="/#guide">
             <MvpButton variant="outline" size="lg" className="w-full sm:w-auto text-lg px-8">
               이용 방법 보기
             </MvpButton>
           </Link>
        </div>
      </div>

      {/* 배경 조명 효과 (Ambient Glows) */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-indigo-600/10 blur-[120px] rounded-full -z-0 pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/4 w-[400px] h-[400px] bg-violet-600/5 blur-[100px] rounded-full -z-0 pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-pink-600/5 blur-[120px] rounded-full -z-0 pointer-events-none"></div>
    </section>
  );
}
