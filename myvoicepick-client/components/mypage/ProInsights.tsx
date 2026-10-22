import Link from 'next/link';

interface Props {
  latestAnalysis: { taskId: string; matchedSongTitle?: string; matchedArtist?: string };
}

export default function ProInsights({ latestAnalysis }: Props) {
  return (
    <div className="workspace-panel workspace-song">
      <p className="workspace-kicker">최근 분석 · 추천곡</p>
      <div><h2>{latestAnalysis.matchedSongTitle || '추천곡 정보 없음'}</h2><p className="workspace-description">{latestAnalysis.matchedArtist}</p></div>
      <Link href={`/analyze?taskId=${encodeURIComponent(latestAnalysis.taskId)}`} className="workspace-primary">전체 결과 보기</Link>
    </div>
  );
}
