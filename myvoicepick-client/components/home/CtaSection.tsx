import React from 'react';
import Link from 'next/link';
import { MvpButton } from '../mvp/MvpButton';

export function CtaSection() {
  return (
    <section className="mvp-section text-center relative">
      <div className="mvp-container max-w-4xl">
         <div className="mvp-glass-card p-12 md:p-20 relative overflow-hidden group hover:border-indigo-500/30 transition-colors duration-500">
            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">
                지금 당신의 목소리를 <br className="hidden md:block" />발견할 준비가 되셨나요?
              </h2>
              <p className="text-[var(--mvp-text-muted)] mb-10 max-w-xl mx-auto text-lg">
                이미 전 세계 수많은 사용자가 MyVoicePick을 통해 자신의 음악적 정체성을 찾았습니다. 지금 바로 경험해보세요.
              </p>
              <Link href="/analyze">
                <MvpButton variant="primary" size="lg" className="text-lg px-10 py-4 group-hover:scale-105 transition-transform">
                  무료로 분석 시작하기
                </MvpButton>
              </Link>
            </div>
            
            {/* 배경 조명 효과 */}
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-indigo-600/30 blur-3xl rounded-full group-hover:scale-110 transition-transform duration-700"></div>
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-violet-600/30 blur-3xl rounded-full group-hover:scale-110 transition-transform duration-700"></div>
         </div>
      </div>
    </section>
  );
}
