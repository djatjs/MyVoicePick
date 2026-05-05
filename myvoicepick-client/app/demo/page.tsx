import '../../styles/mvp-design.css';
import { MvpNav } from '../../components/mvp/MvpNav';
import { MvpFooter } from '../../components/mvp/MvpFooter';
import { MvpButton } from '../../components/mvp/MvpButton';
import { PlayCircle, SkipForward, Info } from 'lucide-react';
import Link from 'next/link';

export default function DemoPage() {
  return (
    <main className="mvp-canvas min-h-screen flex flex-col">
      <MvpNav />
      
      <div className="flex-1 py-24">
        <div className="mvp-container">
          <div className="text-center max-w-4xl mx-auto mb-16">
            <span className="mvp-gradient-text text-xs font-black uppercase tracking-[0.3em] mb-4 block">Product Tour</span>
            <h1 className="text-5xl md:text-6xl mvp-display mb-6">See it in Action.</h1>
            <p className="text-xl text-[var(--mvp-text-muted)]">
              AI가 목소리를 분석하고 아티스트와 매칭하는 전 과정을 2분 만에 확인하세요.
            </p>
          </div>

          {/* Video Placeholder Area */}
          <div className="mvp-glass-card max-w-5xl mx-auto aspect-video mb-24 relative overflow-hidden group cursor-pointer border-indigo-500/20">
             <div className="absolute inset-0 bg-indigo-900/10 flex flex-col items-center justify-center gap-6">
                <PlayCircle className="w-24 h-24 text-indigo-400 group-hover:scale-110 transition-transform shadow-[0_0_40px_rgba(99,102,241,0.3)]" />
                <p className="text-xl font-bold tracking-tight">Watch Demo Video</p>
             </div>
             {/* Decorative UI elements overlay */}
             <div className="absolute bottom-8 left-8 right-8 flex justify-between items-center bg-black/20 backdrop-blur-md p-4 rounded-xl border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex gap-4">
                   <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                   <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                   <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                </div>
                <div className="text-[10px] uppercase font-bold tracking-widest text-white/40">2:45 / 3:00</div>
             </div>
          </div>

          {/* Key Steps Section */}
          <div className="grid md:grid-cols-3 gap-12">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold">1</div>
                 <h3 className="text-xl font-bold">Record or Upload</h3>
              </div>
              <p className="text-sm text-[var(--mvp-text-muted)] leading-relaxed">
                30초 이상의 보컬 녹음 파일을 준비하세요. 
                주변 소음이 적을수록 더 정확한 DNA 분석이 가능합니다.
              </p>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-violet-500 text-white flex items-center justify-center font-bold">2</div>
                 <h3 className="text-xl font-bold">AI DNA Extraction</h3>
              </div>
              <p className="text-sm text-[var(--mvp-text-muted)] leading-relaxed">
                우리의 AI 엔진이 음역대, 음색, 에너지를 수천 개의 파라미터로 변환하여 
                당신만의 독특한 보컬 프로필을 생성합니다.
              </p>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-pink-500 text-white flex items-center justify-center font-bold">3</div>
                 <h3 className="text-xl font-bold">Get Match & Reason</h3>
              </div>
              <p className="text-sm text-[var(--mvp-text-muted)] leading-relaxed">
                단순히 '누구와 닮았다'가 아닌, 왜 그런 결과가 나왔는지에 대한 
                과학적인 분석 리포트와 추천 곡을 즉시 확인하세요.
              </p>
            </div>
          </div>

          {/* Final CTA */}
          <div className="mt-32 text-center">
            <Link href="/analyze">
               <MvpButton variant="primary" size="lg">Ready? Start Analysis Now</MvpButton>
            </Link>
          </div>
        </div>
      </div>

      <MvpFooter />
    </main>
  );
}
