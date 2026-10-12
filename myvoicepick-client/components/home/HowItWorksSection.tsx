import React from 'react';

const STEPS = [
  {
    step: "01",
    title: "음성 녹음 및 업로드",
    description: "30초 분량의 자유로운 노래를 녹음하거나 기존 파일을 업로드하세요. 스튜디오 품질이 아니어도 괜찮습니다.",
  },
  {
    step: "02",
    title: "AI 정밀 분석",
    description: "음역대, 배음, 공명 등 수백 가지 보컬 파라미터를 실시간으로 추출하고 분석합니다.",
  },
  {
    step: "03",
    title: "결과 확인 및 매칭",
    description: "당신과 가장 비슷한 음색을 가진 아티스트를 확인하고, 내게 딱 맞는 곡을 추천받으세요.",
  }
];

export function HowItWorksSection() {
  return (
    <section id="guide" className="mvp-section relative bg-[#09090b]/50 scroll-mt-20">
      <div className="mvp-container">
        <div className="mb-10 md:mb-16">
          <h2 className="text-3xl md:text-5xl font-black mb-4">How It <span className="mvp-gradient-text">Works</span></h2>
          <p className="text-[var(--mvp-text-muted)] text-base md:text-lg max-w-2xl break-keep">
            복잡한 과정 없이 단 3단계만으로 당신의 보컬 아이덴티티를 찾을 수 있습니다.
          </p>
        </div>

        <div className="relative">
          {/* 데스크탑 연결선 */}
          <div className="hidden md:block absolute top-[40px] left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-indigo-500/0 via-indigo-500/30 to-violet-500/0"></div>
          
          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            {STEPS.map((item, idx) => (
              <div key={idx} className="relative flex flex-row md:flex-col items-start md:items-center text-left md:text-center gap-5 md:gap-0 group">
                <div className="w-14 h-14 md:w-20 md:h-20 shrink-0 rounded-full bg-[var(--mvp-surface)] border border-white/10 flex items-center justify-center text-lg md:text-2xl font-black text-indigo-400 md:mb-6 z-10 shadow-lg group-hover:scale-110 group-hover:border-indigo-400/50 group-hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all duration-300">
                  {item.step}
                </div>
                <div className="min-w-0 pt-1 md:pt-0">
                  <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-3">{item.title}</h3>
                  <p className="text-sm md:text-base text-[var(--mvp-text-muted)] break-keep leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
