import { AudioLines, Music2 } from 'lucide-react';

export function DashboardPreview() {
  return (
    <div id="result-example" className="home-result" aria-label="분석 결과 예시">
      <div className="home-result-top"><span><AudioLines size={17} aria-hidden="true" /> 나의 보컬 리포트</span><span className="home-example-label">결과 예시</span></div>
      <div className="home-wave" aria-hidden="true">
        <svg viewBox="0 0 480 120" preserveAspectRatio="none">
          <path className="home-wave-grid" d="M0 30H480M0 60H480M0 90H480M80 0V120M160 0V120M240 0V120M320 0V120M400 0V120" />
          <path className="home-wave-line" d="M0 60H18L22 48L26 72L30 60H43L48 36L53 84L58 49L63 68L68 60H80L85 25L90 95L95 39L100 80L105 52L110 68L115 60H130L135 44L140 77L145 19L150 103L155 31L160 88L165 45L170 74L175 60H188L193 37L198 84L203 10L208 110L213 26L218 93L223 39L228 80L233 60H248L253 47L258 75L263 23L268 99L273 42L278 83L283 54L288 67L293 60H310L315 34L320 87L325 15L330 104L335 38L340 84L345 50L350 70L355 60H370L375 43L380 78L385 30L390 91L395 49L400 72L405 60H425L430 47L435 73L440 57L445 63H480" />
        </svg>
        <span>나만의 목소리, 하나의 새로운 발견.</span>
      </div>
      <div className="home-match">
        <div><p className="home-result-label">나와 닮은 가수</p><h2>성시경</h2><p>내 목소리와 비교한 아티스트</p></div>
        <div className="home-score"><strong>92<span>%</span></strong><span>음색 유사도</span></div>
      </div>
      <div className="home-track">
        <div className="home-track-icon"><Music2 size={25} aria-hidden="true" /></div>
        <div><p className="home-result-label">추천곡</p><h3>너의 모든 순간</h3><p>성시경</p></div>
        <span className="home-track-tag">발라드</span>
      </div>
      <p className="home-example-note">이해를 돕기 위한 예시이며, 실제 결과는 업로드한 음성에 따라 달라집니다.</p>
    </div>
  );
}
