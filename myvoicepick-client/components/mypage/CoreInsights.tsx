interface Props {
  latestAnalysis: { matchedSongTitle?: string; similarityScore?: number; vocalStats?: { similar_artists?: string[] } };
}

export default function CoreInsights({ latestAnalysis }: Props) {
  return (
    <div className="workspace-panel workspace-artist">
      <p className="workspace-kicker">최근 분석 · 나와 닮은 가수</p>
      <h2>{latestAnalysis.vocalStats?.similar_artists?.[0] || '아티스트 정보 없음'}</h2>
      <div className="workspace-similarity"><strong>{latestAnalysis.similarityScore ?? '—'}<span>{latestAnalysis.similarityScore != null ? '%' : ''}</span></strong><span>{latestAnalysis.matchedSongTitle ? `추천곡 「${latestAnalysis.matchedSongTitle}」과 음색 유사도` : '추천곡과 음색 유사도'}</span></div>
      <p className="workspace-note">노래 실력의 점수가 아닌, 목소리 특징을 비교한 값입니다.</p>
    </div>
  );
}
