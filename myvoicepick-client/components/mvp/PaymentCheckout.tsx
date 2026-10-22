"use client";

import { useEffect, useRef, useState } from 'react';
import { loadPaymentWidget, type PaymentWidgetInstance } from '@tosspayments/payment-widget-sdk';
import Link from 'next/link';

export function PaymentCheckout({ plan, amount }: { plan: 'PRO' | 'STUDIO'; amount: number }) {
  const widgetRef = useRef<PaymentWidgetInstance | null>(null);
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let disposed = false;
    async function initialize() {
      try {
        const key = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
        if (!key) throw new Error('결제 설정을 불러올 수 없습니다. 잠시 후 다시 시도해주세요.');
        const widget = await loadPaymentWidget(key, `USER_${Math.random().toString(36).slice(2)}`);
        if (disposed) return;
        const methods = widget.renderPaymentMethods('#payment-method', { value: amount }, { variantKey: 'DEFAULT' });
        widget.renderAgreement('#agreement', { variantKey: 'AGREEMENT' });
        widgetRef.current = widget;
        methods.on('ready', () => { if (!disposed) setReady(true); });
      } catch (cause) {
        if (!disposed) setError(cause instanceof Error ? cause.message : '결제 수단을 불러오지 못했습니다.');
      }
    }
    void initialize();
    return () => { disposed = true; };
  }, [amount]);

  async function pay() {
    if (!ready || submitting || !widgetRef.current) return;
    setSubmitting(true);
    setError('');
    try {
      await widgetRef.current.requestPayment({
        orderId: Math.random().toString(36).slice(2),
        orderName: `MyVoicePick ${plan} 플랜`,
        successUrl: `${window.location.origin}/checkout/success?plan=${plan}`,
        failUrl: `${window.location.origin}/checkout/fail`,
      });
    } catch {
      setError('결제가 취소되었거나 진행되지 않았습니다. 결제 내역을 확인한 뒤 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="payment-card">
      <p className="payment-kicker">선택한 플랜</p><h2 id="payment-title">{plan} 플랜 결제</h2>
      <div className="payment-amount"><span>결제 예정 금액</span><strong>{amount.toLocaleString('ko-KR')}<small>원</small></strong></div>
      <p className="payment-note">{amount === 100 ? '현재 테스트 금액 100원이 적용됩니다. ' : ''}결제 수단과 금액, 약관을 확인하고 진행해주세요.</p>
      <div id="payment-method" /><div id="agreement" />
      {error && <p role="alert" className="payment-error">{error}</p>}
      <button className="payment-submit" onClick={pay} disabled={!ready || submitting}>{submitting ? '결제 요청 중' : ready ? `${amount.toLocaleString('ko-KR')}원 결제하기` : '결제 수단 준비 중'}</button>
      <Link href="/pricing" className="payment-back">요금제 다시 보기</Link>
    </div>
  );
}
