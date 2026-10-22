"use client";

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import '../../../styles/mvp-design.css';
import '../../../styles/workspace.css';
import { MvpNav } from '../../../components/mvp/MvpNav';
import { MvpFooter } from '../../../components/mvp/MvpFooter';
import { PaymentResult } from '../../../components/mvp/PaymentResult';
import { paymentConfirmation } from '../../../lib/payment-confirmation';

function SuccessContent() {
  const searchParams = useSearchParams();
  const paymentKey = searchParams.get('paymentKey');
  const orderId = searchParams.get('orderId');
  const amount = searchParams.get('amount');
  const plan = searchParams.get('plan');
  const confirmation = useMemo(() => paymentConfirmation(paymentKey, orderId, amount, plan), [paymentKey, orderId, amount, plan]);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    if (!confirmation) return;
    let active = true;
    async function confirm() {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) { if (active) setStatus('error'); return; }
        const response = await fetch('/api/v1/payment/toss/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(confirmation),
        });
        if (active) setStatus(response.ok ? 'success' : 'error');
      } catch {
        if (active) setStatus('error');
      }
    }
    void confirm();
    return () => { active = false; };
  }, [confirmation]);

  return <PaymentResult status={confirmation ? status : 'error'} plan={plan} amount={amount} />;
}

export default function CheckoutSuccessPage() {
  return <div className="mvp-canvas workspace-page min-h-screen flex flex-col"><MvpNav /><main className="workspace-container payment-page"><Suspense fallback={<PaymentResult status="loading" />}><SuccessContent /></Suspense></main><MvpFooter /></div>;
}
