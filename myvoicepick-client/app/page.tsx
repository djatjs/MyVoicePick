import Link from 'next/link';
import '../styles/mvp-design.css';
import '../styles/home.css';
import { MvpNav } from '../components/mvp/MvpNav';
import { MvpFooter } from '../components/mvp/MvpFooter';
import { HeroSection } from '../components/home/HeroSection';
import { FeatureSection } from '../components/home/FeatureSection';
import { HowItWorksSection } from '../components/home/HowItWorksSection';
import { CtaSection } from '../components/home/CtaSection';

export default function Home() {
  return (
    <div className="mvp-canvas home-page">
      <a href="#main-content" className="home-skip-link">본문으로 건너뛰기</a>
      <MvpNav />
      <main id="main-content">
        <HeroSection />
        <FeatureSection />
        <HowItWorksSection />
        <section id="pricing" className="mvp-container home-pricing">
          <div><p className="home-intro">나에게 맞는 이용 방식</p><h2>먼저 경험하고,<br />필요한 만큼 선택하세요.</h2></div>
          <div><p>무료와 Pro 플랜의 제공 기능과 요금을<br className="hidden sm:block" /> 비교하고 선택할 수 있습니다.</p><Link href="/pricing" className="home-text-link">요금제 비교하기</Link></div>
        </section>
        <CtaSection />
      </main>
      <MvpFooter />
    </div>
  );
}
