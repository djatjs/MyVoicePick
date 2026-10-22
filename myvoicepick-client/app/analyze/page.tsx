import { Suspense } from 'react';
import '../../styles/mvp-design.css';
import '../../styles/workspace.css';
import { MvpNav } from '../../components/mvp/MvpNav';
import { MvpFooter } from '../../components/mvp/MvpFooter';
import MvpAudioUploader from '../../components/mvp/MvpAudioUploader';

export default function AnalyzePage() {
  return (
    <div className="mvp-canvas workspace-page min-h-screen flex flex-col">
      <MvpNav />
      <main className="workspace-container workspace-analyze">
        <Suspense fallback={<p role="status">분석 화면을 불러오는 중입니다.</p>}>
          <MvpAudioUploader />
        </Suspense>
      </main>
      <MvpFooter />
    </div>
  );
}
