import '../../styles/mvp-design.css';
import { MvpNav } from '../../components/mvp/MvpNav';
import { MvpFooter } from '../../components/mvp/MvpFooter';
import { Code2, Terminal, Cpu, Globe, ArrowRight, Lock } from 'lucide-react';
import { MvpButton } from '../../components/mvp/MvpButton';

export default function ApiDocsPage() {
  return (
    <main className="mvp-canvas min-h-screen flex flex-col">
      <MvpNav />
      
      <div className="flex-1 py-14 md:py-24">
        <div className="mvp-container">
          {/* Header */}
          <div className="text-center max-w-5xl mx-auto mb-12 md:mb-20">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 rounded-full border border-indigo-500/20 mb-6">
               <Lock className="w-3 h-3 text-indigo-400" />
               <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Private Beta Access</span>
            </div>
            <span className="mvp-gradient-text text-xs font-black uppercase tracking-[0.3em] mb-4 block">Developer Hub</span>
            <h1 className="text-4xl md:text-6xl mvp-display mb-4 md:mb-6">Vocal Engine API.</h1>
            <p className="text-base md:text-xl text-[var(--mvp-text-muted)] break-keep leading-relaxed md:whitespace-nowrap">
              MyVoicePick의 강력한 AI 보컬 분석 엔진을 당신의 서비스에 통합하세요.
            </p>
          </div>

          {/* API Categories */}
          <div className="grid md:grid-cols-3 gap-5 md:gap-8 mb-12 md:mb-24">
             <div className="mvp-glass-card p-6 md:p-8 border-white/5 group hover:border-indigo-500/30 transition-all">
                <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                   <Cpu className="text-indigo-400" />
                </div>
                <h3 className="text-xl font-bold mb-3">Vocal Separation</h3>
                <p className="text-sm text-[var(--mvp-text-muted)] leading-relaxed break-keep">
                   혼합된 오디오 트랙에서 보컬만 깨끗하게 추출하는 고성능 음원 분리 API입니다.
                </p>
             </div>
             <div className="mvp-glass-card p-6 md:p-8 border-white/5 group hover:border-violet-500/30 transition-all">
                <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                   <Terminal className="text-violet-400" />
                </div>
                <h3 className="text-xl font-bold mb-3">DNA Extraction</h3>
                <p className="text-sm text-[var(--mvp-text-muted)] leading-relaxed break-keep">
                   음역대, 배음, 공명 등 수백 가지 보컬 특성을 데이터(JSON) 형태로 반환합니다.
                </p>
             </div>
             <div className="mvp-glass-card p-6 md:p-8 border-white/5 group hover:border-pink-500/30 transition-all">
                <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                   <Globe className="text-pink-400" />
                </div>
                <h3 className="text-xl font-bold mb-3">Artist Matching</h3>
                <p className="text-sm text-[var(--mvp-text-muted)] leading-relaxed break-keep">
                   자체 데이터베이스와 대조하여 가장 유사한 아티스트 페르소나를 매칭합니다.
                </p>
             </div>
          </div>

          {/* Code Preview Placeholder */}
          <div className="mvp-glass-card p-2 md:p-4 mb-16 md:mb-24 overflow-hidden border-white/5">
             <div className="bg-[#0f172a] rounded-lg p-4 md:p-8 font-mono text-xs md:text-sm overflow-x-auto">
                <div className="flex items-center gap-2 mb-4 md:mb-6 border-b border-white/5 pb-4">
                   <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                   <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                   <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                   <span className="ml-2 md:ml-4 text-white/20 text-[10px] md:text-xs uppercase tracking-widest truncate">v1/analyze_vocal.json</span>
                </div>
                <pre className="text-indigo-300">
{`{
  "status": "success",
  "vocal_dna": {
    "pitch_range": "E2-G5",
    "harmonics_complexity": 0.89,
    "resonance_score": 0.94,
    "matching_artist": "Jannabi",
    "similarity": 0.982
  },
  "processing_time": "1.24s"
}`}
                </pre>
             </div>
          </div>

          {/* CTA / Waitlist */}
          <div className="max-w-2xl mx-auto text-center">
             <Code2 className="w-12 h-12 md:w-16 md:h-16 text-white/10 mx-auto mb-6 md:mb-8" />
             <h2 className="text-2xl md:text-3xl font-black mb-4 md:mb-6 break-keep">전문 개발자를 위한 얼리 액세스</h2>
             <p className="text-sm md:text-base text-[var(--mvp-text-muted)] mb-8 md:mb-10 break-keep">
                현재 MyVoicePick API는 선별된 파트너사에게만 비공개 베타로 제공되고 있습니다. 
                귀사의 서비스에 보컬 분석 기술을 도입하고 싶다면 지금 신청하세요.
             </p>
             <MvpButton variant="primary" size="lg" className="px-12">베타 신청하기</MvpButton>
          </div>

        </div>
      </div>

      <MvpFooter />
    </main>
  );
}
