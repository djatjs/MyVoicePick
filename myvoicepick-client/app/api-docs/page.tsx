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
        <header className="workspace-heading"><p className="workspace-kicker">개발자를 위한 API 안내</p><h1>분석 요청부터<br />결과 조회까지.</h1><p className="workspace-description">MyVoicePick 웹 서비스가 사용하는 분석 API의 기본 흐름입니다.</p></header>
        <aside className="info-callout"><h2>로그인한 사용자의 인증이 필요합니다</h2><p>아래는 웹 서비스용 API 안내입니다. 별도 파트너 API나 API 키 발급은 제공하지 않습니다. 인증 토큰은 외부에 공유하거나 공개 코드에 넣지 마세요.</p></aside>
        <section className="info-api-section"><h2>분석은 비동기로 진행됩니다</h2><p>파일을 전송하면 작업 ID를 받고, 해당 ID로 상태를 조회합니다. 완료된 응답에서 추천곡과 분석 지표를 확인할 수 있습니다.</p><div className="info-table-wrap"><table><caption className="sr-only">분석 API 엔드포인트</caption><thead><tr><th scope="col">메서드</th><th scope="col">경로</th><th scope="col">역할</th></tr></thead><tbody>
          <tr><td>POST</td><td><code>/api/v1/analyses</code></td><td>파일 전송 · 작업 접수 (202)</td></tr>
          <tr><td>GET</td><td><code>/api/v1/analyses</code></td><td>내 분석 목록 (최신순, <code>size</code>로 개수 제한)</td></tr>
          <tr><td>GET</td><td><code>/api/v1/analyses/&#123;taskId&#125;</code></td><td>작업 상태와 결과</td></tr>
          <tr><td>DELETE</td><td><code>/api/v1/analyses/&#123;taskId&#125;</code></td><td>내 기록 삭제 (204)</td></tr>
        </tbody></table></div></section>
        <section className="info-api-section"><h2>파일 전송</h2><p><code>Authorization: Bearer &lt;ACCESS_TOKEN&gt;</code> 헤더와 함께 <code>multipart/form-data</code>의 <code>file</code> 필드로 음성을 전송합니다. MP3·WAV·M4A, 50MB 미만 파일을 준비하세요.</p><pre><code>{`POST /api/v1/analyses
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: multipart/form-data; boundary=...

file: <음성 파일>`}</code></pre><p>접수 성공 시 <code>202 Accepted</code>와 작업 ID가 반환되고, 결과를 확인할 주소가 <code>Location</code> 헤더에 담깁니다. 다음은 응답 형식 예시입니다.</p><pre><code>{`Location: /api/v1/analyses/example-task-id

{
  "taskId": "example-task-id"
}`}</code></pre></section>
        <section className="info-api-section"><h2>상태 확인과 결과 처리</h2><dl className="info-status-list"><div><dt>PENDING</dt><dd>분석 대기</dd></div><div><dt>PROCESSING</dt><dd>음성 처리 중</dd></div><div><dt>COMPLETED</dt><dd>분석 완료</dd></div><div><dt>FAILED</dt><dd>분석 실패</dd></div></dl><p>완료 응답에는 <code>matchedArtist</code>, <code>matchedSongTitle</code>, <code>similarityScore</code>, <code>pitchHz</code> 등의 필드가 포함됩니다. 제공되지 않는 필드는 비어 있을 수 있습니다.</p><p>인증이 없으면 401, 진행 중인 작업이 있어 새 요청이 제한되면 429가 반환됩니다. 없는 작업이나 다른 계정의 작업은 404가 반환됩니다.</p></section>
        <div className="info-closing"><p>내 목소리에 어울리는 다음 곡을 찾아보세요.</p><Link href="/analyze" className="workspace-primary">내 목소리 분석하기</Link></div>
      </main>
      <MvpFooter />
    </div>
  );
}
