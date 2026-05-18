'use client';

import { useEffect, useRef, useState, Suspense } from "react";
import { loadPaymentWidget, PaymentWidgetInstance } from "@tosspayments/payment-widget-sdk";
import { useSearchParams } from "next/navigation";
import { MvpButton } from "../../components/mvp/MvpButton";
import { Loader2 } from "lucide-react";

// 환경변수에서 토스페이먼츠 클라이언트 키를 불러옵니다.
const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || "";

function CheckoutContent() {
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan') || 'PRO';
  const amount = plan === 'STUDIO' ? 49000 : 19000;
  
  const paymentWidgetRef = useRef<PaymentWidgetInstance | null>(null);
  const paymentMethodsWidgetRef = useRef<any>(null);
  const [price, setPrice] = useState(amount);
  const [isReady, setIsReady] = useState(false);
  const [customerKey, setCustomerKey] = useState("");

  useEffect(() => {
    // 임의의 고유 customerKey 생성
    setCustomerKey("USER_" + Math.random().toString(36).substring(2, 10));
  }, []);
  
  useEffect(() => {
    if (!customerKey) return;
    const fetchPaymentWidget = async () => {
      try {
        const paymentWidget = await loadPaymentWidget(clientKey, customerKey);
        const paymentMethodsWidget = paymentWidget.renderPaymentMethods(
          "#payment-method",
          { value: price },
          { variantKey: "DEFAULT" }
        );
        paymentWidget.renderAgreement(
          "#agreement", 
          { variantKey: "AGREEMENT" }
        );
        paymentWidgetRef.current = paymentWidget;
        paymentMethodsWidgetRef.current = paymentMethodsWidget;
        
        paymentMethodsWidget.on('ready', () => {
            setIsReady(true);
        });
      } catch (error) {
        console.error("Error fetching payment widget:", error);
      }
    };
    fetchPaymentWidget();
  }, [price, customerKey]);

  const handlePayment = async () => {
    const paymentWidget = paymentWidgetRef.current;
    try {
      await paymentWidget?.requestPayment({
        orderId: Math.random().toString(36).slice(2),
        orderName: `MyVoicePick ${plan} 플랜`,
        successUrl: `${window.location.origin}/checkout/success?plan=${plan}`,
        failUrl: `${window.location.origin}/checkout/fail`,
        customerEmail: "customer123@gmail.com",
        customerName: "김토스",
      });
    } catch (error) {
      console.error("Error requesting payment:", error);
    }
  };

  return (
    <div className="w-full max-w-2xl bg-white rounded-3xl p-8 shadow-2xl relative z-10 animate-fade-in">
      <h2 className="text-3xl font-black text-gray-900 mb-2">결제하기</h2>
      <p className="text-gray-500 mb-8 font-medium">안전한 토스페이먼츠 환경에서 결제가 진행됩니다.</p>
      
      <div className="mb-6 p-5 bg-indigo-50 border border-indigo-100 rounded-2xl flex justify-between items-center">
          <span className="font-bold text-gray-600">선택한 플랜</span>
          <span className="font-black text-indigo-600 text-xl tracking-tight">{plan} 플랜</span>
      </div>
      
      <div id="payment-method" className="w-full" />
      <div id="agreement" className="w-full mt-4" />
      
      <MvpButton onClick={handlePayment} disabled={!isReady} className="w-full mt-8 !py-4 text-lg">
        {isReady ? `${price.toLocaleString()}원 결제하기` : '결제 모듈 불러오는 중...'}
      </MvpButton>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
        <Suspense fallback={<Loader2 className="w-10 h-10 animate-spin text-white" />}>
            <CheckoutContent />
        </Suspense>
    </div>
  );
}
