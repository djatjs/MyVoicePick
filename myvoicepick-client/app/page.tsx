import '../styles/mvp-design.css';
import Image from 'next/image';
import Link from 'next/link';
import { MvpNav } from '../components/mvp/MvpNav';
import { MvpFooter } from '../components/mvp/MvpFooter';
import { MvpButton } from '../components/mvp/MvpButton';
import { Play, Sparkles, Activity, Zap } from 'lucide-react';

export default function Home() {
  return (
    <main className="mvp-canvas min-h-screen flex flex-col">
      <MvpNav />

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center pt-20 overflow-hidden">
        <div className="mvp-container relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10 mb-8 animate-in fade-in slide-in-from-top-4 duration-1000">
             <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
             <span className="text-xs font-bold uppercase tracking-widest text-indigo-300">Vocal Intelligence 2.0</span>
          </div>
          <h1 className="text-6xl md:text-8xl mvp-display mb-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
             Discover Your <br />
             <span className="mvp-gradient-text">Unique Voice DNA</span>
          </h1>
          <p className="text-xl md:text-2xl text-[var(--mvp-text-muted)] font-medium max-w-5xl mx-auto mb-12 leading-relaxed break-keep md:whitespace-nowrap animate-in fade-in duration-1000 delay-300">
             AI가 당신의 음색 속에 숨겨진 코드를 분석하고, 가장 빛나는 음악적 동반자를 찾아드립니다.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 animate-in fade-in duration-1000 delay-500">
             <Link href="/analyze">
               <MvpButton variant="primary" size="lg" className="w-full sm:w-auto">지금 분석 시작하기</MvpButton>
             </Link>
             <Link href="/demo">
               <MvpButton variant="outline" size="lg" className="w-full sm:w-auto">데모 영상 보기</MvpButton>
             </Link>
          </div>
        </div>

        {/* Ambient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-indigo-600/10 blur-[120px] rounded-full -z-0"></div>
        <div className="absolute top-1/2 left-1/4 w-[400px] h-[400px] bg-violet-600/5 blur-[100px] rounded-full -z-0"></div>
      </section>

      {/* Dashboard Preview Section */}
      <section className="pb-[120px] relative z-10">
        <div className="mvp-container">
           <div className="mvp-glass-card p-4 md:p-8 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-700">
              <div className="relative aspect-video rounded-xl overflow-hidden border border-white/10 shadow-2xl">
                 <Image 
                    src="/demo/dashboard.png" 
                    alt="MyVoicePick Interface" 
                    fill 
                    className="object-cover"
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-[var(--mvp-bg)]/80 via-transparent to-transparent"></div>
                 <div className="absolute bottom-12 left-12 right-12 flex justify-between items-end">
                    <div className="space-y-2">
                       <h3 className="text-3xl font-black mvp-title">Professional Analysis</h3>
                       <p className="text-white/60">당신의 보컬 특성을 데이터로 확인하세요.</p>
                    </div>
                    <div className="hidden lg:flex gap-4">
                       <div className="h-12 w-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20">
                          <Play className="w-5 h-5" />
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </section>

      {/* Core Features */}
      <section className="mvp-section bg-white/[0.01]">
         <div className="mvp-container">
            <div className="grid md:grid-cols-3 gap-8">
               <div className="mvp-glass-card p-8 hover:border-white/20 transition-all group">
                  <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-8 border border-indigo-500/20 group-hover:scale-110 transition-transform">
                     <Sparkles className="text-indigo-400" />
                  </div>
                  <h4 className="text-xl font-bold mb-4">Precision Profiling</h4>
                  <p className="text-[var(--mvp-text-muted)] text-sm leading-relaxed">
                     단 30초의 녹음으로 음역대, 배음 구조, 공명 등 수백 가지 보컬 특성을 분석합니다.
                  </p>
               </div>
               <div className="mvp-glass-card p-8 hover:border-white/20 transition-all group">
                  <div className="w-14 h-14 bg-violet-500/10 rounded-2xl flex items-center justify-center mb-8 border border-violet-500/20 group-hover:scale-110 transition-transform">
                     <Activity className="text-violet-400" />
                  </div>
                  <h4 className="text-xl font-bold mb-4">Artist Matching</h4>
                  <p className="text-[var(--mvp-text-muted)] text-sm leading-relaxed">
                     당신의 보컬 DNA와 가장 유사한 프로 아티스트를 매칭하고 맞춤형 연습 곡을 추천합니다.
                  </p>
               </div>
               <div className="mvp-glass-card p-8 hover:border-white/20 transition-all group">
                  <div className="w-14 h-14 bg-pink-500/10 rounded-2xl flex items-center justify-center mb-8 border border-pink-500/20 group-hover:scale-110 transition-transform">
                     <Zap className="text-pink-400" />
                  </div>
                  <h4 className="text-xl font-bold mb-4">Instant Results</h4>
                  <p className="text-[var(--mvp-text-muted)] text-sm leading-relaxed">
                     기다릴 필요 없습니다. 클라우드 기반 AI 분산 처리로 실시간에 가까운 분석 결과를 제공합니다.
                  </p>
               </div>
            </div>
         </div>
      </section>

      {/* CTA Section */}
      <section className="mvp-section text-center">
        <div className="mvp-container max-w-4xl">
           <div className="mvp-glass-card p-16 relative overflow-hidden">
              <div className="relative z-10">
                <h2 className="text-4xl md:text-5xl font-black mb-6">지금 당신의 목소리를 <br />발견할 준비가 되셨나요?</h2>
                <p className="text-[var(--mvp-text-muted)] mb-10 max-w-xl mx-auto">이미 전 세계 100만 명 이상의 사용자가 MyVoicePick을 통해 자신의 음악적 정체성을 찾았습니다.</p>
                <Link href="/analyze">
                  <MvpButton variant="primary" size="lg">분석 시작하기</MvpButton>
                </Link>
              </div>
              <div className="absolute -top-24 -left-24 w-64 h-64 bg-indigo-600/20 blur-3xl rounded-full"></div>
              <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-violet-600/20 blur-3xl rounded-full"></div>
           </div>
        </div>
      </section>

      <MvpFooter />
    </main>
  );
}
