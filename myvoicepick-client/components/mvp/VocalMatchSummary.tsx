"use client";

import { useRef, useState } from 'react';
import Image from 'next/image';
import { AudioLines, Music2 } from 'lucide-react';

interface Props {
  result: { artist: string; title: string; similarityScore?: number; previewUrl?: string; albumCoverUrl?: string };
  example?: boolean;
}

// a link to the .m4a made some browsers download it, so the preview plays in the page
function PreviewButton({ url }: { url: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play().catch(() => setPlaying(false));
    else audio.pause();
  }
  return (
    <>
      <audio ref={audioRef} src={url} preload="none" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
      <button className="workspace-primary" onClick={toggle} aria-pressed={playing}>{playing ? '일시정지' : '미리듣기'}</button>
    </>
  );
}

export function VocalMatchSummary({ result, example = false }: Props) {
  return (
    <section id={example ? 'result-example' : undefined} className={`vocal-summary ${example ? '' : 'vocal-summary-report'}`} aria-label={example ? '분석 결과 예시' : '보컬 분석 요약'}>
      <div className="vocal-summary-top"><span><AudioLines size={17} aria-hidden="true" /> 나의 보컬 리포트</span><span className="vocal-summary-badge">{example ? '결과 예시' : '분석 완료'}</span></div>
      {example && (
      <div className="vocal-wave" aria-hidden="true">
        <svg viewBox="0 0 480 120" preserveAspectRatio="none">
          <path className="vocal-wave-grid" d="M0 30H480M0 60H480M0 90H480M80 0V120M160 0V120M240 0V120M320 0V120M400 0V120" />
          <path className="vocal-wave-line" d="M0 60H18L22 48L26 72L30 60H43L48 36L53 84L58 49L63 68L68 60H80L85 25L90 95L95 39L100 80L105 52L110 68L115 60H130L135 44L140 77L145 19L150 103L155 31L160 88L165 45L170 74L175 60H188L193 37L198 84L203 10L208 110L213 26L218 93L223 39L228 80L233 60H248L253 47L258 75L263 23L268 99L273 42L278 83L283 54L288 67L293 60H310L315 34L320 87L325 15L330 104L335 38L340 84L345 50L350 70L355 60H370L375 43L380 78L385 30L390 91L395 49L400 72L405 60H425L430 47L435 73L440 57L445 63H480" />
        </svg>
        <span>나만의 목소리, 하나의 새로운 발견.</span>
      </div>
      )}
      <div className="vocal-summary-body">
        <div className="vocal-match">
          <div><p className="vocal-label">나와 닮은 가수</p><h2>{result.artist}</h2><p>내 목소리와 비교한 아티스트</p></div>
          <div className="vocal-score"><strong>{result.similarityScore ?? '—'}<span>{result.similarityScore != null ? '%' : ''}</span></strong><span>음색 유사도</span></div>
        </div>
        <div className="vocal-track">
          {/* unoptimized: covers come from external stores (iTunes, YouTube); serve as-is instead of allow-listing hosts */}
          <div className="vocal-track-icon">{result.albumCoverUrl ? <Image src={result.albumCoverUrl} alt={`${result.title} 앨범 표지`} width={112} height={112} unoptimized /> : <Music2 size={25} aria-hidden="true" />}</div>
          <div className="vocal-track-copy"><p className="vocal-label">추천곡</p><h3>{result.title}</h3><p>{result.artist}</p></div>
          {!example && (result.previewUrl ? <PreviewButton url={result.previewUrl} /> : <button className="workspace-secondary" disabled>미리듣기 없음</button>)}
        </div>
      </div>
      <p className="vocal-summary-note">{example ? '이해를 돕기 위한 예시이며, 실제 결과는 업로드한 음성에 따라 달라집니다.' : '음색 유사도는 목소리 특징을 비교한 값으로, 노래 실력의 점수가 아닙니다.'}</p>
    </section>
  );
}
