import { AudioLines, Music2 } from 'lucide-react';

export interface MatchResult {
  title: string;
  artist: string;
  previewUrl?: string;
  voiceTags?: string[];
  similarityScore?: number;
  pitchHz?: number;
  recommendReason?: string;
  vocalPersona?: string;
  vocalStats?: {
    warmth: number; clarity: number; power: number; rhythm: number; emotion: number;
    dna_128_points?: number[];
  };
  userPlan?: string;
  proFeatures?: { key?: string; guide?: string; playlist?: { title: string; artist: string }[] };
}

export function AnalysisResult({ result, onUpgrade }: { result: MatchResult; onUpgrade: () => void }) {
  const isPro = result.userPlan === 'PRO' || result.userPlan === 'STUDIO';
  const points = result.vocalStats?.dna_128_points;
  const hasPoints = points?.length === 128 && points.every(Number.isFinite);
  return (
    <div className="workspace-result">
      <div className="workspace-result-grid">
        <section className="workspace-panel workspace-artist">
          <p className="workspace-kicker"><AudioLines size={18} aria-hidden="true" /> 나와 닮은 가수</p>
          <h2>{result.artist}</h2>
          <div className="workspace-similarity"><strong>{result.similarityScore ?? '—'}<span>{result.similarityScore != null ? '%' : ''}</span></strong><span>음색 유사도</span></div>
          <p className="workspace-note">목소리 특징을 비교한 값으로, 노래 실력의 점수가 아닙니다.</p>
          {result.voiceTags && <div className="workspace-tags">{result.voiceTags.map(tag => <span key={tag}>{tag}</span>)}</div>}
        </section>
        <section className="workspace-panel workspace-song">
          <p className="workspace-kicker"><Music2 size={18} aria-hidden="true" /> 내게 어울리는 추천곡</p>
          <div><h2>{result.title}</h2><p className="workspace-description">{result.artist}</p></div>
          {result.previewUrl ? <a className="workspace-primary" href={result.previewUrl} target="_blank" rel="noopener noreferrer">미리듣기 <span className="sr-only">(새 창)</span></a> : <button className="workspace-primary" disabled>미리듣기를 제공하지 않는 곡입니다</button>}
        </section>
      </div>
      {(result.recommendReason || result.vocalPersona) && <section className="workspace-explanation"><p className="workspace-kicker">이 곡을 추천한 이유</p>{result.vocalPersona && <h3>{result.vocalPersona}</h3>}<p>{result.recommendReason}</p></section>}
      <section className="workspace-panel">
        <h2 className="workspace-section-title">내 목소리의 특징</h2>
        <p className="workspace-note">아래 수치는 분석 지표이며, 높을수록 노래를 잘한다는 의미는 아닙니다.</p>
        {result.vocalStats ? <dl className="workspace-stats">
          <div><dt>따뜻함</dt><dd>{result.vocalStats.warmth ?? '—'}</dd></div>
          <div><dt>선명도</dt><dd>{result.vocalStats.clarity ?? '—'}</dd></div>
          <div><dt>성량</dt><dd>{result.vocalStats.power ?? '—'}</dd></div>
          <div><dt>리듬감</dt><dd>{result.vocalStats.rhythm ?? '—'}</dd></div>
          <div><dt>표현력</dt><dd>{result.vocalStats.emotion ?? '—'}</dd></div>
          <div><dt>음높이</dt><dd>{result.pitchHz ? `${result.pitchHz} Hz` : '—'}</dd></div>
        </dl> : <p className="workspace-empty">이 분석에는 목소리 특징 데이터가 없습니다.</p>}
        {hasPoints ? <details className="workspace-details"><summary>상세 음성 데이터 보기</summary><p className="workspace-note">음색 비교에 사용하는 128개 특징값입니다. 시간에 따른 녹음 파형이나 실력 점수가 아닙니다.</p><div className="workspace-spectrum" role="img" aria-label="128개 음성 특징값 분포">{points.map((value, index) => <span key={index} style={{ height: `${Math.min(100, Math.max(2, value))}%` }} />)}</div></details> : <p className="workspace-note">이 분석에는 상세 음성 데이터가 없습니다.</p>}
      </section>
      <section className="workspace-panel workspace-pro">
        <div><p className="workspace-kicker">Pro 연습 가이드</p><h2 className="workspace-section-title">다음 연습을 위한 힌트</h2></div>
        {isPro ? <div className="workspace-pro-content">
          <div><h3>추천 키</h3><p>{result.proFeatures?.key || '이 분석에는 추천 키가 없습니다.'}</p></div>
          <div><h3>연습 가이드</h3><p>{result.proFeatures?.guide || '이 분석에는 연습 가이드가 없습니다.'}</p></div>
          {!!result.proFeatures?.playlist?.length && <div><h3>추천 플레이리스트</h3><ul>{result.proFeatures.playlist.map((song, index) => <li key={index}><a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${song.artist} ${song.title}`)}`} target="_blank" rel="noopener noreferrer">{song.title} <span>{song.artist} · YouTube에서 찾기</span><span className="sr-only"> (새 창)</span></a></li>)}</ul></div>}
        </div> : <div><p className="workspace-description">추천 키와 연습 가이드 등 Pro 제공 기능을 확인하세요.</p><button className="workspace-secondary" onClick={onUpgrade}>Pro 기능 알아보기</button></div>}
      </section>
    </div>
  );
}
