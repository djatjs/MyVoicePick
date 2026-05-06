import React from 'react';
import { MvpButton } from '../mvp/MvpButton';
import { Check } from 'lucide-react';

export function PricingSection() {
  return (
    <section id="pricing" className="mvp-section pb-24 relative z-10 scroll-mt-20">
      <div className="mvp-container">
        {/* Header */}
        <div className="text-center max-w-5xl mx-auto mb-20 px-4">
          <span className="mvp-gradient-text text-xs font-black uppercase tracking-[0.3em] mb-4 block">Simple Pricing</span>
          <h2 className="text-4xl md:text-5xl font-black mb-6">Scale Your Sound.</h2>
          <p className="text-lg text-[var(--mvp-text-muted)] break-keep leading-relaxed md:whitespace-nowrap max-w-2xl mx-auto">
            당신의 보컬 여정에 맞는 플랜을 선택하세요. 기본적인 분석부터 전문적인 레코딩 가이드까지 제공합니다.
          </p>
        </div>

        {/* Pricing Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {/* Free Plan */}
          <div className="mvp-glass-card p-10 flex flex-col h-full border-white/5 hover:-translate-y-2 transition-transform duration-500">
            <div className="mb-8">
              <h3 className="text-2xl font-bold mb-2">Free</h3>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-black">₩0</span>
                <span className="text-[var(--mvp-text-muted)] mb-1 text-xs">/월</span>
              </div>
            </div>
            <ul className="space-y-6 mb-10 flex-1">
              <li className="flex items-start gap-3 text-sm">
                <Check className="w-5 h-5 text-indigo-400 shrink-0" />
                <div>
                  <p className="font-bold">일일 3회 분석</p>
                  <p className="text-[10px] text-[var(--mvp-text-muted)] leading-tight">가벼운 체험을 위한 기본 횟수 제공</p>
                </div>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <Check className="w-5 h-5 text-indigo-400 shrink-0" />
                <div>
                  <p className="font-bold">기본 아티스트 매칭</p>
                  <p className="text-[10px] text-[var(--mvp-text-muted)] leading-tight">대중적인 인기 아티스트 TOP 10 대조</p>
                </div>
              </li>
              <li className="flex items-start gap-3 text-sm text-[var(--mvp-text-muted)]">
                <Check className="w-5 h-5 text-white/10 shrink-0" />
                <div>
                  <p className="font-bold line-through">정밀 DNA 리포트</p>
                  <p className="text-[10px] leading-tight">Pro 플랜 전용 기능</p>
                </div>
              </li>
            </ul>
            <MvpButton variant="outline" className="w-full">시작하기</MvpButton>
          </div>

          {/* Pro Plan */}
          <div className="mvp-glass-card p-10 flex flex-col h-full border-indigo-500/30 relative hover:-translate-y-2 transition-transform duration-500 shadow-[0_0_40px_rgba(99,102,241,0.1)]">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-500 text-white px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest shadow-[0_0_20px_rgba(99,102,241,0.5)]">
              Most Popular
            </div>
            <div className="mb-8">
              <h3 className="text-2xl font-bold mb-2">Pro</h3>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-black">₩19,000</span>
                <span className="text-[var(--mvp-text-muted)] mb-1 text-xs">/월</span>
              </div>
            </div>
            <ul className="space-y-6 mb-10 flex-1">
              <li className="flex items-start gap-3 text-sm">
                <Check className="w-5 h-5 text-indigo-400 shrink-0" />
                <div>
                  <p className="font-bold">무제한 보컬 분석</p>
                  <p className="text-[10px] text-[var(--mvp-text-muted)] leading-tight">횟수 제한 없이 마음껏 분석 가능</p>
                </div>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <Check className="w-5 h-5 text-indigo-400 shrink-0" />
                <div>
                  <p className="font-bold">전체 아티스트 데이터베이스</p>
                  <p className="text-[10px] text-[var(--mvp-text-muted)] leading-tight">5만 명 이상의 국내외 전체 DB 정밀 매칭</p>
                </div>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <Check className="w-5 h-5 text-indigo-400 shrink-0" />
                <div>
                  <p className="font-bold">128포인트 DNA 분석</p>
                  <p className="text-[10px] text-[var(--mvp-text-muted)] leading-tight">음역대, 배음 구조 등 전문 보컬 지표 제공</p>
                </div>
              </li>
            </ul>
            <MvpButton variant="primary" className="w-full">구독하기</MvpButton>
          </div>

          {/* Studio Plan */}
          <div className="mvp-glass-card p-10 flex flex-col h-full border-white/5 hover:-translate-y-2 transition-transform duration-500">
            <div className="mb-8">
              <h3 className="text-2xl font-bold mb-2">Studio</h3>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-black">₩49,000</span>
                <span className="text-[var(--mvp-text-muted)] mb-1 text-xs">/월</span>
              </div>
            </div>
            <ul className="space-y-6 mb-10 flex-1">
              <li className="flex items-start gap-3 text-sm">
                <Check className="w-5 h-5 text-indigo-400 shrink-0" />
                <div>
                  <p className="font-bold">Pro 플랜의 모든 기능</p>
                </div>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <Check className="w-5 h-5 text-indigo-400 shrink-0" />
                <div>
                  <p className="font-bold">고음질 멀티트랙 레코딩</p>
                  <p className="text-[10px] text-[var(--mvp-text-muted)] leading-tight">작곡/편집용 고품질 보컬 파일 추출</p>
                </div>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <Check className="w-5 h-5 text-indigo-400 shrink-0" />
                <div>
                  <p className="font-bold">실시간 피치 피드백</p>
                  <p className="text-[10px] text-[var(--mvp-text-muted)] leading-tight">연습 중 실시간 음정/발성 교정 가이드</p>
                </div>
              </li>
            </ul>
            <MvpButton variant="outline" className="w-full">문의하기</MvpButton>
          </div>
        </div>
      </div>
    </section>
  );
}
