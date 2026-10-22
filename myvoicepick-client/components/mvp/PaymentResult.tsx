import Link from 'next/link';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export function PaymentResult({ status, plan, amount }: { status: 'loading' | 'success' | 'error'; plan?: string | null; amount?: string | null }) {
  return (
    <section className="workspace-panel payment-result" aria-live="polite">
      {status === 'loading' ? <Loader2 className="animate-spin" aria-hidden="true" /> : status === 'success' ? <CheckCircle2 aria-hidden="true" /> : <AlertCircle aria-hidden="true" />}
      <p className="workspace-kicker">{status === 'loading' ? '결제 확인 중' : status === 'success' ? '결제 승인 완료' : '결제 확인 필요'}</p>
      <h1>{status === 'loading' ? '결제 결과를 확인하고 있어요' : status === 'success' ? '다음 연습을 시작해보세요.' : '결제를 완료하지 못했어요'}</h1>
      <p className="workspace-description">{status === 'loading' ? '확인이 끝날 때까지 잠시 기다려주세요.' : status === 'success' ? `${plan} 플랜을 이용할 수 있습니다. 마이페이지에서 분석 결과를 확인하세요.` : '결제가 취소되었거나 승인 결과를 확인하지 못했습니다. 다시 결제하기 전에 결제 내역과 현재 플랜을 확인해주세요.'}</p>
      {status === 'success' && amount && <p className="payment-receipt">승인 금액 <strong>{Number(amount).toLocaleString('ko-KR')}원</strong></p>}
      {status !== 'loading' && <div className="payment-result-actions"><Link href="/mypage" className="workspace-primary">마이페이지 보기</Link><Link href="/pricing" className="workspace-inline-link">요금제 다시 보기</Link></div>}
    </section>
  );
}
