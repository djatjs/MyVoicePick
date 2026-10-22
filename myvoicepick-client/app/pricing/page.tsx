import '../../styles/mvp-design.css';
import '../../styles/workspace.css';
import '../../styles/pricing.css';
import { MvpNav } from '../../components/mvp/MvpNav';
import { MvpFooter } from '../../components/mvp/MvpFooter';
import { PricingSection } from '../../components/home/PricingSection';

export default function PricingPage() {
  return (
    <div className="mvp-canvas workspace-page min-h-screen flex flex-col">
      <MvpNav />
      <main className="workspace-container pricing-page"><PricingSection /></main>
      <MvpFooter />
    </div>
  );
}
