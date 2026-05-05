import '../../styles/mvp-design.css';
import { MvpNav } from '../../components/mvp/MvpNav';
import { MvpFooter } from '../../components/mvp/MvpFooter';
import { Mic2, ShieldCheck, Zap, Info, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function GuidePage() {
  return (
    <main className="mvp-canvas min-h-screen flex flex-col">
      <MvpNav />
      
      <div className="flex-1 py-24">
        <div className="mvp-container">
          {/* Header */}
          <div className="text-center max-w-5xl mx-auto mb-20 px-4">
            <span className="mvp-gradient-text text-xs font-black uppercase tracking-[0.3em] mb-4 block">How it Works</span>
            <h1 className="text-5xl md:text-6xl mvp-display mb-6">Vocal Guide.</h1>
            <p className="text-xl text-[var(--mvp-text-muted)] break-keep leading-relaxed md:whitespace-nowrap">
              최고의 분석 결과를 얻기 위한 녹음 팁과 AI 리포트 활용법을 안내합니다.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 mb-24">
             {/* Step 1 */}
             <div className="mvp-glass-card p-10 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-6 border border-indigo-500/20">
                   <Mic2 className="text-indigo-400 w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold mb-4">1. 완벽한 녹음 환경</h3>
                <p className="text-[var(--mvp-text-muted)] text-sm leading-relaxed mb-6">
                  주변 소음이 없는 조용한 공간에서 녹음하세요. 스마트폰 마이크를 입에서 15~20cm 정도 떨어뜨리는 것이 가장 정확합니다.
                </p>
                <div className="mt-auto pt-4 border-t border-white/5 w-full text-xs text-indigo-300">
                   Tip: 이어폰 마이크보다는 폰 자체 마이크가 더 좋습니다.
                </div>
             </div>

             {/* Step 2 */}
             <div className="mvp-glass-card p-10 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-violet-500/10 rounded-2xl flex items-center justify-center mb-6 border border-violet-500/20">
                   <Zap className="text-violet-400 w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold mb-4">2. 자연스러운 가창</h3>
                <p className="text-[var(--mvp-text-muted)] text-sm leading-relaxed mb-6">
                  목소리를 꾸미지 말고 평소 본인의 목소리로 노래하세요. 30초 내외의 분량이면 AI가 충분히 당신의 DNA를 추출할 수 있습니다.
                </p>
                <div className="mt-auto pt-4 border-t border-white/5 w-full text-xs text-violet-300">
                   Tip: 무반주(Acapella) 상태에서 녹음할 때 정확도가 가장 높습니다.
                </div>
             </div>

             {/* Step 3 */}
             <div className="mvp-glass-card p-10 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-pink-500/10 rounded-2xl flex items-center justify-center mb-6 border border-pink-500/20">
                   <ShieldCheck className="text-pink-400 w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold mb-4">3. 결과 리포트 활용</h3>
                <p className="text-[var(--mvp-text-muted)] text-sm leading-relaxed mb-6">
                  분석된 5축 지표를 통해 자신의 강점을 파악하세요. 매칭된 아티스트의 창법을 참고하여 본인만의 스타일을 발전시킬 수 있습니다.
                </p>
                <div className="mt-auto pt-4 border-t border-white/5 w-full text-xs text-pink-300">
                   Tip: 주기적으로 분석하여 목소리의 변화를 트래킹해보세요.
                </div>
             </div>
          </div>

          {/* FAQ Section */}
          <div className="max-w-4xl mx-auto">
             <h2 className="text-3xl font-black mb-12 text-center flex items-center justify-center gap-3">
                <Info className="text-indigo-400" />
                자주 묻는 질문
             </h2>
             <div className="space-y-4">
                {[
                   { q: "녹음 파일 형식은 무엇이 좋은가요?", a: "mp3, wav, m4a 등 대부분의 오디오 형식을 지원합니다. 고음질일수록 분석 결과가 정확해집니다." },
                   { q: "가사가 없는 허밍으로도 분석이 되나요?", a: "네, 허밍으로도 기본적인 음색 DNA 분석은 가능하지만, 가창 데이터가 포함될 때 더 정밀한 매칭이 가능합니다." },
                   { q: "제 녹음 파일은 안전하게 보호되나요?", a: "모든 데이터는 분석 즉시 서버에서 삭제되며, AI 학습용으로 무단 사용되지 않습니다." }
                ].map((faq, i) => (
                   <div key={i} className="mvp-glass-card p-6 border-white/5 hover:border-white/10 transition-colors">
                      <h4 className="font-bold mb-2 text-indigo-300">Q. {faq.q}</h4>
                      <p className="text-sm text-[var(--mvp-text-muted)]">A. {faq.a}</p>
                   </div>
                ))}
             </div>
          </div>

          {/* CTA */}
          <div className="mt-24 text-center">
             <Link href="/analyze" className="inline-flex items-center gap-4 group">
                <span className="text-2xl font-black group-hover:text-indigo-400 transition-colors">준비되셨나요? 지금 목소리를 분석해보세요</span>
                <div className="w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center group-hover:translate-x-2 transition-all">
                   <ArrowRight className="text-white" />
                </div>
             </Link>
          </div>
        </div>
      </div>

      <MvpFooter />
    </main>
  );
}
