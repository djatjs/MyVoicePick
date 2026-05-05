import '../../styles/mvp-design.css';
import { MvpNav } from '../../components/mvp/MvpNav';
import { MvpFooter } from '../../components/mvp/MvpFooter';
import { MvpButton } from '../../components/mvp/MvpButton';
import { Sparkles, Activity, Zap, Mic2, ShieldCheck, BarChart3 } from 'lucide-react';
import Link from 'next/link';

export default function FeaturesPage() {
  return (
    <main className="mvp-canvas min-h-screen flex flex-col">
      <MvpNav />
      
      <div className="flex-1">
        {/* Header Section */}
        <section className="pt-24 pb-16">
          <div className="mvp-container text-center max-w-5xl mx-auto">
            <span className="mvp-gradient-text text-xs font-black uppercase tracking-[0.3em] mb-4 block">Product Features</span>
            <h1 className="text-5xl md:text-6xl mvp-display mb-6">Built for Voice Accuracy.</h1>
            <p className="text-xl font-medium text-[var(--mvp-text-muted)] break-keep leading-relaxed md:whitespace-nowrap">
              MyVoicePick은 단순한 분석 도구를 넘어, 아티스트의 가능성을 데이터로 증명하는 보컬 인텔리전스 플랫폼입니다.
            </p>
          </div>
        </section>

        {/* Main Features Grid */}
        <section className="pb-24">
          <div className="mvp-container grid md:grid-cols-2 gap-12">
            
            <div className="mvp-glass-card p-10 flex flex-col gap-6">
              <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20">
                <Sparkles className="text-indigo-400 w-8 h-8" />
              </div>
              <h3 className="text-3xl font-black mvp-title">128-Point Vocal DNA</h3>
              <p className="text-[var(--mvp-text-muted)] leading-relaxed">
                음역대, 배음 구조, 공명, 호흡의 압력 등 128가지 보컬 지표를 정밀하게 추출합니다. 
                AI 모델은 당신의 목소리에서 육안으로 확인할 수 없는 음악적 패턴을 읽어냅니다.
              </p>
            </div>

            <div className="mvp-glass-card p-10 flex flex-col gap-6">
              <div className="w-16 h-16 bg-violet-500/10 rounded-2xl flex items-center justify-center border border-violet-500/20">
                <BarChart3 className="text-violet-400 w-8 h-8" />
              </div>
              <h3 className="text-3xl font-black mvp-title">Real-time Spectral Analysis</h3>
              <p className="text-[var(--mvp-text-muted)] leading-relaxed">
                업로드된 오디오는 실시간 스펙트럼 분석 과정을 거칩니다. 
                주파수 대역별 에너지 분포를 시각화하여 당신의 목소리가 가진 고유한 '따뜻함'과 '명료도'를 수치화합니다.
              </p>
            </div>

            <div className="mvp-glass-card p-10 flex flex-col gap-6">
              <div className="w-16 h-16 bg-pink-500/10 rounded-2xl flex items-center justify-center border border-pink-500/20">
                <Activity className="text-pink-400 w-8 h-8" />
              </div>
              <h3 className="text-3xl font-black mvp-title">Artist Similarity Engine</h3>
              <p className="text-[var(--mvp-text-muted)] leading-relaxed">
                전 세계 5만 명 이상의 프로 아티스트 데이터베이스와 당신의 보컬 DNA를 대조합니다. 
                단순히 닮은 목소리가 아닌, 창법과 에너지의 결이 가장 유사한 아티스트를 찾아줍니다.
              </p>
            </div>

            <div className="mvp-glass-card p-10 flex flex-col gap-6">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
                <ShieldCheck className="text-emerald-400 w-8 h-8" />
              </div>
              <h3 className="text-3xl font-black mvp-title">Secure Voice Identity</h3>
              <p className="text-[var(--mvp-text-muted)] leading-relaxed">
                당신의 목소리 데이터는 암호화되어 보호됩니다. 
                분석 완료 후 원본 파일은 즉시 안전하게 파기되며, 분석 결과인 '보컬 지문'만 아티스트 본인에게 제공됩니다.
              </p>
            </div>

          </div>
        </section>

        {/* Artist Matching Database Section (Merged from Artists page) */}
        <section id="artists" className="py-24 border-t border-white/5 bg-white/[0.01]">
          <div className="mvp-container">
            <div className="max-w-3xl mb-16">
              <span className="mvp-gradient-text text-xs font-black uppercase tracking-[0.3em] mb-4 block">Matching Database</span>
              <h2 className="text-4xl md:text-5xl mvp-display mb-6">Learn from the Icons.</h2>
              <p className="text-lg text-[var(--mvp-text-muted)]">
                MyVoicePick은 수만 명의 아티스트 데이터를 학습했습니다. 
                기술력과 데이터가 만나 당신의 목소리에 가장 어울리는 페르소나를 매칭합니다.
              </p>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16 p-8 rounded-[var(--mvp-radius-md)] bg-white/[0.02] border border-white/5">
               <div className="text-center border-r border-white/5 last:border-0">
                  <p className="text-3xl font-black mb-1">50K+</p>
                  <p className="text-[10px] text-[var(--mvp-text-muted)] uppercase tracking-widest">Total Artists</p>
               </div>
               <div className="text-center border-r border-white/5 last:border-0">
                  <p className="text-3xl font-black mb-1">12M+</p>
                  <p className="text-[10px] text-[var(--mvp-text-muted)] uppercase tracking-widest">Matches</p>
               </div>
               <div className="text-center border-r border-white/5 last:border-0">
                  <p className="text-3xl font-black mb-1">180+</p>
                  <p className="text-[10px] text-[var(--mvp-text-muted)] uppercase tracking-widest">Countries</p>
               </div>
               <div className="text-center">
                  <p className="text-3xl font-black mb-1">24/7</p>
                  <p className="text-[10px] text-[var(--mvp-text-muted)] uppercase tracking-widest">AI Learning</p>
               </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-16 opacity-60">
              {['Jannabi', 'IU', 'Sung Si-kyung', 'Taeyeon', 'Zico', 'NewJeans'].map((name, i) => (
                <div key={i} className="py-4 px-6 rounded-xl border border-white/5 bg-white/[0.02] text-center">
                  <p className="text-xs font-bold text-white/40">{name}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 border-t border-white/5 bg-gradient-to-b from-transparent to-indigo-900/10">
          <div className="mvp-container text-center">
            <h2 className="text-4xl font-black mb-8">당신의 보컬 DNA는 어떤 아티스트와 닮았나요?</h2>
            <Link href="/analyze">
              <MvpButton variant="primary" size="lg">지금 무료로 분석하기</MvpButton>
            </Link>
          </div>
        </section>
      </div>

      <MvpFooter />
    </main>
  );
}
