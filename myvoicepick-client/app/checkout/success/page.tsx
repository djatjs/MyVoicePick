'use client';

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const paymentKey = searchParams.get("paymentKey");
  const orderId = searchParams.get("orderId");
  const amount = searchParams.get("amount");
  const plan = searchParams.get("plan");
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    if (!paymentKey || !orderId || !amount) {
      setStatus('error');
      return;
    }

    const confirmPayment = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const res = await fetch('/api/v1/payment/toss/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ paymentKey, orderId, amount: Number(amount), plan })
        });

        if (res.ok) {
          setStatus('success');
          setTimeout(() => {
            router.push('/mypage');
          }, 2500);
        } else {
          setStatus('error');
        }
      } catch (e) {
        setStatus('error');
      }
    };
    
    confirmPayment();
  }, [paymentKey, orderId, amount, plan, router]);

  return (
    <div className="text-center space-y-6">
        {status === 'loading' && (
            <>
                <Loader2 className="w-20 h-20 text-indigo-500 animate-spin mx-auto" />
                <h2 className="text-3xl font-black text-white">결제 승인 중...</h2>
                <p className="text-white/60 font-medium text-lg">안전하게 결제를 완료하고 있습니다.</p>
            </>
        )}
        {status === 'success' && (
            <div className="animate-in zoom-in-95 duration-500">
                <CheckCircle2 className="w-24 h-24 text-emerald-400 mx-auto mb-6" />
                <h2 className="text-4xl font-black text-white mb-4">결제 완료!</h2>
                <p className="text-white/60 text-lg mb-8 font-medium">성공적으로 {plan} 플랜으로 업그레이드 되었습니다.<br/>잠시 후 마이페이지로 이동합니다.</p>
            </div>
        )}
        {status === 'error' && (
            <div className="animate-in zoom-in-95 duration-500">
                <AlertCircle className="w-24 h-24 text-red-500 mx-auto mb-6" />
                <h2 className="text-4xl font-black text-red-500 mb-4">결제 승인 실패</h2>
                <p className="text-white/60 text-lg mb-8">오류가 발생했습니다. 고객센터로 문의해주세요.</p>
                <button onClick={() => router.push('/mypage')} className="px-8 py-3 bg-white/10 rounded-xl text-white font-bold hover:bg-white/20 transition-colors">돌아가기</button>
            </div>
        )}
    </div>
  );
}

export default function CheckoutSuccessPage() {
    return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
            <Suspense fallback={<Loader2 className="w-10 h-10 animate-spin text-white" />}>
                <SuccessContent />
            </Suspense>
        </div>
    );
}
