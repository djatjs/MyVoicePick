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
        <header className="workspace-heading"><p className="workspace-kicker">녹음부터 결과 확인까지</p><h1>좋아하는 노래로<br />가볍게 시작하세요.</h1><p className="workspace-description">파일을 준비하는 방법과 분석 결과를 읽는 방법을 안내합니다.</p></header>
        <nav className="info-jump-links" aria-label="가이드 목차"><a href="#prepare">파일 준비</a><a href="#upload">업로드</a><a href="#results">결과 읽기</a><a href="#questions">자주 묻는 질문</a></nav>
        <ol className="info-guide-steps">
          <li id="prepare"><span>01</span><section><h2>목소리가 선명한 파일 준비하기</h2><p>주변 소음과 반주가 적고, 내 목소리가 잘 들리는 녹음을 준비하세요. 과도한 음향 효과보다 평소 목소리가 드러나는 녹음이 비교에 도움이 됩니다.</p><div className="info-file-spec"><strong>MP3 · WAV · M4A</strong><span>50MB 미만</span></div></section></li>
          <li id="upload"><span>02</span><section><h2>로그인하고 파일 올리기</h2><p>분석 페이지에서 파일을 선택하거나 업로드 영역에 놓아주세요. 파일을 선택하면 업로드와 분석이 시작됩니다. 진행 중인 분석이 끝난 뒤 새 파일을 올릴 수 있습니다.</p><p>처리 시간은 파일과 대기 상황에 따라 달라지며 완료되면 결과가 표시됩니다.</p></section></li>
          <li id="results"><span>03</span><section><h2>추천곡과 목소리 특징 살펴보기</h2><p>먼저 닮은 가수와 추천곡을 확인하세요. 음색 유사도는 추천곡과 목소리 특징을 비교한 값이며, 높을수록 실력이 좋다는 뜻은 아닙니다.</p><p>표시되는 음역은 이번 녹음에서 들린 범위라 내가 낼 수 있는 전체 음역과는 다를 수 있습니다. 녹음 조건이 다른 결과를 단순한 성장 점수로 비교하지 마세요.</p><Link href="/mypage" className="workspace-inline-link">저장된 기록 보기</Link></section></li>
        </ol>
        <section id="questions" className="info-faq"><h2>자주 묻는 질문</h2>
          <details><summary>파일이 업로드되지 않아요</summary><p>파일 형식과 크기를 확인하고 로그인이 유지되는지 확인해주세요. 확장자만 바꾸는 대신 녹음 앱에서 지원 형식으로 내보내세요.</p></details>
          <details><summary>분석이 끝나지 않거나 실패했어요</summary><p>대기 중이거나 처리에 시간이 걸릴 수 있습니다. 오류 안내가 표시되면 목소리가 더 선명한 파일로 다시 시도하세요. 기존 작업이 진행 중이면 완료 또는 실패 상태가 된 뒤 새 분석을 시작할 수 있습니다.</p></details>
          <details><summary>분석 기록은 어디에서 관리하나요?</summary><p>마이페이지에서 내 계정의 분석 기록을 다시 열거나 삭제할 수 있습니다. 분석 기록 삭제와 원본 음성 파일의 보관은 서로 다른 항목입니다.</p></details>
          <details><summary>유료 플랜이 꼭 필요한가요?</summary><p>닮은 가수, 추천곡과 기본 목소리 특징은 무료로 확인할 수 있습니다. 추천 키와 추가 추천곡이 필요하다면 <Link href="/pricing">요금제를 비교해보세요.</Link></p></details>
        </section>
        <div className="info-closing"><p>내 목소리에 어울리는 다음 곡을 찾아보세요.</p><Link href="/analyze" className="workspace-primary">내 목소리 분석하기</Link></div>
      </main>
      <MvpFooter />
    </div>
  );
}
