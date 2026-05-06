import '../styles/mvp-design.css';
import { MvpNav } from '../components/mvp/MvpNav';
import { MvpFooter } from '../components/mvp/MvpFooter';
import { HeroSection } from '../components/home/HeroSection';
import { ArtistMarquee } from '../components/home/ArtistMarquee';
import { DashboardPreview } from '../components/home/DashboardPreview';
import { FeatureSection } from '../components/home/FeatureSection';
import { HowItWorksSection } from '../components/home/HowItWorksSection';
import { PricingSection } from '../components/home/PricingSection';
import { CtaSection } from '../components/home/CtaSection';

export default function Home() {
  return (
    <main className="mvp-canvas min-h-screen flex flex-col selection:bg-indigo-500/30">
      <MvpNav />

      {/* 1. Hero Section: 메인 타이틀 및 소개 */}
      <HeroSection />

      {/* 2. Artist Marquee: 스크롤되는 아티스트 이름 애니메이션 */}
      <ArtistMarquee />

      {/* 3. Dashboard Preview: 대시보드 인터페이스 프리뷰 */}
      <DashboardPreview />

      {/* 4. Feature Section: 주요 기술 소개 */}
      <FeatureSection />

      {/* 5. How It Works: 3단계 이용 방법 안내 */}
      <HowItWorksSection />

      {/* 6. Pricing Section: 요금제 안내 */}
      <PricingSection />

      {/* 7. CTA Section: 분석 시작 유도 */}
      <CtaSection />

      <MvpFooter />
    </main>
  );
}
