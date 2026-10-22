interface Props {
  latestAnalysis: { matchedArtist?: string; vocalPersona?: string; similarityScore?: number; recommendReason?: string };
}

export default function CoreInsights({ latestAnalysis }: Props) {
  return (
    <div className="workspace-panel workspace-artist">
      <p className="workspace-kicker">최근 분석 · 나와 닮은 가수</p>
      <h2>{latestAnalysis.matchedArtist || '아티스트 정보 없음'}</h2>
      <div className="workspace-similarity"><strong>{latestAnalysis.similarityScore ?? '—'}<span>{latestAnalysis.similarityScore != null ? '%' : ''}</span></strong><span>음색 유사도</span></div>
      {latestAnalysis.vocalPersona && <p className="workspace-persona">{latestAnalysis.vocalPersona}</p>}
      <p className="workspace-note">노래 실력의 점수가 아닌, 목소리 특징을 비교한 값입니다.</p>
    </div>
  );
}
