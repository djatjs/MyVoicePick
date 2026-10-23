"use client";

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import '../../styles/mvp-design.css';
import '../../styles/workspace.css';
import { MvpNav } from '../../components/mvp/MvpNav';
import { MvpFooter } from '../../components/mvp/MvpFooter';
import { PaymentCheckout } from '../../components/mvp/PaymentCheckout';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan') || 'PRO';
  if (plan !== 'PRO' && plan !== 'STUDIO') return <div className="workspace-panel workspace-empty"><h1>플랜을 확인해주세요</h1><p>요금제 페이지에서 이용할 플랜을 다시 선택하세요.</p><Link href="/pricing" className="workspace-primary">요금제 보기</Link></div>;
  return <PaymentCheckout key={plan} plan={plan} amount={plan === 'STUDIO' ? 49000 : 19000} />;
}

export default function CheckoutPage() {
  return (
    <div className="mvp-canvas workspace-page min-h-screen flex flex-col"><MvpNav /><main className="workspace-container payment-page"><header className="workspace-heading"><p className="workspace-kicker">마지막으로 한 번 더 확인하세요</p><h1>선택한 플랜으로<br />다음에 부를 곡을 더 넓게 찾아보세요.</h1></header><Suspense fallback={<p role="status">결제 화면을 준비하고 있어요.</p>}><CheckoutContent /></Suspense></main><MvpFooter /></div>
  );
}
