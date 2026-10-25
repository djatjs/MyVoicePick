import { VocalMatchSummary } from './VocalMatchSummary';

export interface MatchResult {
  title: string;
  artist: string;
  previewUrl?: string;
  albumCoverUrl?: string;
  similarityScore?: number;
  pitchHz?: number;
  recommendReason?: string;
  // measured in the recording; analyses from the old method carry other keys and show the fallback
  vocalStats?: { range_low?: string; range_high?: string; range_center?: string; similar_artists?: string[] };
  userPlan?: string;
  proFeatures?: { key?: string; playlist?: { title: string; artist: string }[] };
}

export function AnalysisResult({ result, onUpgrade }: { result: MatchResult; onUpgrade: () => void }) {
  const isPro = result.userPlan === 'PRO' || result.userPlan === 'STUDIO';
  const voice = result.vocalStats;
  const hasRange = !!(voice?.range_low && voice.range_high);
  return (
    <div className="workspace-result">
      <VocalMatchSummary result={result} />
      {result.recommendReason && <section className="workspace-explanation"><p className="workspace-kicker">이 곡을 추천한 이유</p><p>{result.recommendReason}</p></section>}
      <section className="workspace-panel">
        <h2 className="workspace-section-title">녹음에서 들린 내 목소리</h2>
        <p className="workspace-note">이번 녹음에서 측정한 값이에요. 편하게 부를 수 있는 음역이나 노래 실력을 뜻하지 않아요.</p>
        {hasRange ? <dl className="workspace-stats">
          <div><dt>들린 음역</dt><dd>{voice.range_low} ~ {voice.range_high}</dd></div>
          <div><dt>가장 많이 낸 높이</dt><dd>{voice.range_center || '—'}</dd></div>
          <div><dt>음색이 닮은 가수</dt><dd>{voice.similar_artists?.length ? voice.similar_artists.join(', ') : '—'}</dd></div>
        </dl> : <p className="workspace-empty">이전 방식으로 분석한 기록이라 목소리 특징을 표시하지 않아요. 다시 분석하면 확인할 수 있어요.</p>}
      </section>
      <section className="workspace-panel workspace-pro">
        <div><p className="workspace-kicker">Pro 추천</p><h2 className="workspace-section-title">추천 키와 더 많은 곡</h2></div>
        {isPro ? <div className="workspace-pro-content">
          <div><h3>추천 키</h3><p>{result.proFeatures?.key || '이 분석에는 추천 키가 없습니다.'}</p></div>
          {!!result.proFeatures?.playlist?.length && <div><h3>함께 불러볼 곡</h3><ul>{result.proFeatures.playlist.map((song, index) => <li key={index}><a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${song.artist} ${song.title}`)}`} target="_blank" rel="noopener noreferrer">{song.title} <span>{song.artist} · YouTube에서 찾기</span><span className="sr-only"> (새 창)</span></a></li>)}</ul></div>}
        </div> : <div><p className="workspace-description">추천 키와 함께 불러볼 곡은 Pro에서 확인할 수 있어요.</p><button className="workspace-secondary" onClick={onUpgrade}>Pro 기능 알아보기</button></div>}
      </section>
    </div>
  );
}
