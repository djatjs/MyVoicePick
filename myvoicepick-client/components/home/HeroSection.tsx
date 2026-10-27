import Link from 'next/link';
import { ArrowUpRight, AudioLines } from 'lucide-react';
import { DashboardPreview } from './DashboardPreview';

export function HeroSection() {
  return (
    <section className="home-hero mvp-container">
      <div>
        <p className="home-intro"><AudioLines size={18} aria-hidden="true" /> 목소리로 찾는 나의 플레이리스트</p>
        <h1>내 목소리에는<br />어떤 노래가<br />어울릴까?</h1>
        <p className="home-description">노래한 파일을 올려보세요.<br />나와 닮은 가수부터 어울리는 곡까지,<br />내 목소리에서 찾아드립니다.</p>
        <div className="home-actions">
          <Link href="/analyze" className="home-primary">내 목소리 분석하기 <ArrowUpRight size={19} aria-hidden="true" /></Link>
          <Link href="#result-example" className="home-text-link">결과 예시 살펴보기</Link>
        </div>
        <p className="home-upload-note">MP3 · WAV · M4A 파일 업로드</p>
      </div>
      <DashboardPreview />
    </section>
  );
}
