import '../../../styles/mvp-design.css';
import '../../../styles/workspace.css';
import { MvpNav } from '../../../components/mvp/MvpNav';
import { MvpFooter } from '../../../components/mvp/MvpFooter';
import { PaymentResult } from '../../../components/mvp/PaymentResult';

export default function CheckoutFailPage() {
  return <div className="mvp-canvas workspace-page min-h-screen flex flex-col"><MvpNav /><main className="workspace-container payment-page"><PaymentResult status="error" /></main><MvpFooter /></div>;
}
