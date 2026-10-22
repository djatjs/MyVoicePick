import { AudioLines, Mic2, Music2 } from 'lucide-react';

export function FeatureSection() {
  return (
    <section id="features" className="home-section mvp-container">
      <div className="home-section-heading"><p className="home-intro">숫자 너머, 내 목소리를 이해하는 시간</p><h2>듣기만 했던 목소리를<br />조금 더 알게 되는 일.</h2></div>
      <div className="home-features">
        <article><AudioLines aria-hidden="true" /><h3>내 목소리의 특징</h3><p>음높이와 음성 특성을 분석한 결과를 확인하세요. 익숙한 내 목소리를 새로운 시선으로 볼 수 있습니다.</p></article>
        <article><Mic2 aria-hidden="true" /><h3>나와 닮은 가수</h3><p>내 음성과 아티스트의 음색을 비교합니다. 유사도는 노래 실력의 점수가 아닌, 목소리 특징을 비교한 값입니다.</p></article>
        <article><Music2 aria-hidden="true" /><h3>다음에 부를 노래</h3><p>분석 결과에 따른 추천곡을 만나보세요. 어떤 곡을 부를지 고민될 때 새로운 출발점이 되어줍니다.</p></article>
      </div>
    </section>
  );
}
