import Link from 'next/link';

export function HowItWorksSection() {
  return (
    <section id="guide" className="home-guide home-section">
      <div className="mvp-container home-guide-grid">
        <div className="home-section-heading"><p className="home-intro">시작은 간단하게</p><h2>좋아하는 노래<br />한 소절이면 돼요.</h2><Link href="/guide" className="home-text-link">업로드 가이드 읽기</Link></div>
        <ol className="home-steps">
          <li><span>01</span><div><h3>노래한 파일 올리기</h3><p>내 목소리가 담긴 MP3 또는 WAV 파일을 준비해 업로드하세요.</p></div></li>
          <li><span>02</span><div><h3>목소리 분석 기다리기</h3><p>음성의 특징을 추출하고 아티스트의 음색과 비교합니다.</p></div></li>
          <li><span>03</span><div><h3>나의 결과 만나기</h3><p>닮은 가수와 추천곡을 확인하고, 다음에 부를 노래를 골라보세요.</p></div></li>
        </ol>
      </div>
    </section>
  );
}
