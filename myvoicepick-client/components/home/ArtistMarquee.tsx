import React from 'react';

const ARTISTS = [
  "아이유", "박효신", "성시경", "태연", "정국", "백예린", "나얼", "잔나비",
  "김동률", "폴킴", "이수", "헤이즈", "윤종신", "이하이", "크러쉬"
];

export function ArtistMarquee() {
  return (
    <div className="relative flex overflow-x-hidden border-y border-white/5 bg-white/[0.02] py-8">
      {/* 양 끝에 그라데이션 페이드 효과를 주어 부드럽게 나타나고 사라지게 함 */}
      <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[var(--mvp-bg)] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[var(--mvp-bg)] to-transparent z-10 pointer-events-none" />
      
      {/* 
        무한 스크롤(Marquee) 버그 수정: 
        원본 리스트와 복제본 리스트를 각각 컨테이너로 나누고 side-by-side 로 배치합니다.
        pr-12 (padding-right)를 주어 배열의 마지막 요소(크러쉬)와 다음 배열의 첫 요소(아이유) 
        사이에 gap-12와 동일한 간격을 만듭니다.
      */}
      <div className="animate-marquee flex shrink-0 items-center gap-12 pr-12">
        {ARTISTS.map((artist, idx) => (
          <span 
            key={idx} 
            className="text-2xl font-bold text-white/20 hover:text-white/80 transition-colors cursor-default"
          >
            {artist}
          </span>
        ))}
      </div>
      
      {/* 복제본 리스트 (무한 루프용) */}
      <div aria-hidden="true" className="animate-marquee flex shrink-0 items-center gap-12 pr-12">
        {ARTISTS.map((artist, idx) => (
          <span 
            key={idx} 
            className="text-2xl font-bold text-white/20 hover:text-white/80 transition-colors cursor-default"
          >
            {artist}
          </span>
        ))}
      </div>
    </div>
  );
}
