import '../../styles/mvp-design.css';
import { MvpNav } from '../../components/mvp/MvpNav';
import { MvpFooter } from '../../components/mvp/MvpFooter';
import MvpAudioUploader from '../../components/mvp/MvpAudioUploader';

export default function AnalyzePage() {
  return (
    <main className="mvp-canvas min-h-screen flex flex-col">
      <MvpNav />
      
      <div className="flex-1 flex flex-col pt-12 pb-24">
        {/* Tool Header Section */}
        <section className="mb-16">
          <div className="mvp-container text-center max-w-5xl mx-auto">
            <span className="mvp-gradient-text text-xs font-black uppercase tracking-[0.3em] mb-4 block">Vocal Analysis System</span>
            <h1 className="text-5xl md:text-6xl mvp-display mb-6">Let's find your sound.</h1>
            <p className="text-xl font-medium text-[var(--mvp-text-muted)] break-keep leading-relaxed md:whitespace-nowrap">
              당신의 목소리에서 추출된 고유한 데이터가 세상에 없던 새로운 음악적 발견으로 이어집니다.
            </p>
          </div>
        </section>

        {/* Uploader Section */}
        <section className="relative z-10">
          <div className="mvp-container">
            <MvpAudioUploader />
          </div>
        </section>

        {/* Studio Info Section */}
        <section className="mt-24">
          <div className="mvp-container">
             <div className="grid md:grid-cols-3 gap-8">
                <div className="flex gap-4 items-start p-6 rounded-[var(--mvp-radius-md)] bg-white/[0.02] border border-white/5">
                   <div className="text-indigo-400 mt-1">
                      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                   </div>
                   <div>
                      <h4 className="font-bold mb-1">High Accuracy</h4>
                      <p className="text-xs text-[var(--mvp-text-muted)]">99.9% 정확도의 음향 신호 처리 엔진을 사용하여 정밀한 분석을 보장합니다.</p>
                   </div>
                </div>
                <div className="flex gap-4 items-start p-6 rounded-[var(--mvp-radius-md)] bg-white/[0.02] border border-white/5">
                   <div className="text-violet-400 mt-1">
                      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z"/></svg>
                   </div>
                   <div>
                      <h4 className="font-bold mb-1">Global Database</h4>
                      <p className="text-xs text-[var(--mvp-text-muted)]">전 세계 수만 명의 아티스트 데이터를 기반으로 최적의 매칭을 제공합니다.</p>
                   </div>
                </div>
                <div className="flex gap-4 items-start p-6 rounded-[var(--mvp-radius-md)] bg-white/[0.02] border border-white/5">
                   <div className="text-pink-400 mt-1">
                      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6z"/></svg>
                   </div>
                   <div>
                      <h4 className="font-bold mb-1">Secure & Private</h4>
                      <p className="text-xs text-[var(--mvp-text-muted)]">사용자의 오디오 데이터는 분석 즉시 삭제되며 철저한 보안 가이드를 준수합니다.</p>
                   </div>
                </div>
             </div>
          </div>
        </section>
      </div>

      <MvpFooter />
    </main>
  );
}
