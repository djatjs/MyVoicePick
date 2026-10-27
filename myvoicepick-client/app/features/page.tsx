import Link from 'next/link';
import '../../styles/mvp-design.css';
import '../../styles/workspace.css';
import '../../styles/information.css';
import { MvpNav } from '../../components/mvp/MvpNav';
import { MvpFooter } from '../../components/mvp/MvpFooter';

export default function Page() {
  return (
    <div className="mvp-canvas workspace-page min-h-screen flex flex-col">
      <MvpNav />
      <main className="workspace-container info-page">
        <header className="workspace-heading"><p className="workspace-kicker">MyVoicePick 분석 소개</p><h1>내 목소리를 이해하는<br />세 가지 발견.</h1><p className="workspace-description">노래한 파일에서 목소리의 특징을 비교하고, 새로운 선곡의 힌트를 얻으세요.</p></header>
        <div className="info-feature-list">
          <section><div><p className="workspace-kicker">목소리의 특징</p><h2>익숙한 내 목소리를<br />새롭게 바라보기</h2></div><div><p>음높이와 음색 관련 분석 지표로 내 목소리의 특징을 살펴보세요. 숫자는 분석 결과를 이해하는 단서이며 노래 실력의 점수가 아닙니다.</p><Link href="/guide#results" className="workspace-inline-link">지표 읽는 방법</Link></div></section>
          <section id="artists"><div><p className="workspace-kicker">닮은 가수와 추천곡</p><h2>다음에 부를 노래의<br />새로운 출발점</h2></div><div><p>미리 분석된 곡의 음성 특징과 내 녹음을 비교합니다. 결과에서 아티스트, 음색 유사도, 추천곡과 추천 이유를 확인할 수 있습니다.</p><p>비교 대상은 서비스에 등록된 곡이며, 모든 가수를 포함하거나 실제 가수와 같은 창법임을 보장하지는 않습니다.</p></div></section>
          <section><div><p className="workspace-kicker">저장된 분석 기록</p><h2>한 번의 발견을<br />다음 선곡으로</h2></div><div><p>로그인한 계정의 마이페이지에서 분석 기록을 다시 열어보세요. Pro에서는 추천곡의 추천 키와 함께 불러볼 추가 추천곡을 확인할 수 있습니다.</p><Link href="/pricing" className="workspace-inline-link">제공 기능 비교하기</Link></div></section>
        </div>
        <aside className="info-callout"><h2>녹음에 따라 결과가 달라질 수 있어요</h2><p>선곡과 발성, 반주 및 주변 소음이 분석에 영향을 줄 수 있습니다. 결과는 목소리를 탐색하고 선곡하는 참고 자료로 활용하세요.</p></aside>
        <div className="info-closing"><p>내 목소리에 어울리는 다음 곡을 찾아보세요.</p><Link href="/analyze" className="workspace-primary">내 목소리 분석하기</Link></div>
      </main>
      <MvpFooter />
    </div>
  );
}
