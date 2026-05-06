import React from 'react';
import { Sparkles, Activity, Zap } from 'lucide-react';

const FEATURES = [
  {
    icon: <Sparkles className="w-7 h-7 text-indigo-400" />,
    title: "Precision Profiling",
    description: "단 30초의 녹음으로 음역대, 배음 구조, 공명 등 수백 가지 보컬 특성을 분석합니다.",
    bgClass: "bg-indigo-500/10",
    borderClass: "border-indigo-500/20",
    glowClass: "group-hover:shadow-[0_0_30px_rgba(99,102,241,0.2)]"
  },
  {
    icon: <Activity className="w-7 h-7 text-violet-400" />,
    title: "Artist Matching",
    description: "당신의 보컬 DNA와 가장 유사한 프로 아티스트를 매칭하고 맞춤형 연습 곡을 추천합니다.",
    bgClass: "bg-violet-500/10",
    borderClass: "border-violet-500/20",
    glowClass: "group-hover:shadow-[0_0_30px_rgba(139,92,246,0.2)]"
  },
  {
    icon: <Zap className="w-7 h-7 text-pink-400" />,
    title: "Instant Results",
    description: "기다릴 필요 없습니다. 클라우드 기반 AI 분산 처리로 실시간에 가까운 분석 결과를 제공합니다.",
    bgClass: "bg-pink-500/10",
    borderClass: "border-pink-500/20",
    glowClass: "group-hover:shadow-[0_0_30px_rgba(236,72,153,0.2)]"
  }
];

export function FeatureSection() {
  return (
    <section id="features" className="mvp-section relative scroll-mt-20">
      {/* 백그라운드 데코레이션 */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
      
      <div className="mvp-container relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black mb-4">Core <span className="mvp-gradient-text">Technologies</span></h2>
          <p className="text-[var(--mvp-text-muted)] text-lg max-w-2xl mx-auto">
            최신 음향 공학 기술과 인공지능이 결합하여 당신의 목소리를 완벽하게 해독합니다.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {FEATURES.map((feature, idx) => (
            <div 
              key={idx} 
              className={`mvp-glass-card p-8 hover:border-white/20 transition-all duration-500 group hover:-translate-y-2 ${feature.glowClass}`}
            >
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-8 border transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 ${feature.bgClass} ${feature.borderClass}`}>
                {feature.icon}
              </div>
              <h4 className="text-2xl font-bold mb-4 tracking-tight">{feature.title}</h4>
              <p className="text-[var(--mvp-text-muted)] text-base leading-relaxed break-keep">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
