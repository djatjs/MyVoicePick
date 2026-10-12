'use client';

import { useEffect, useRef, useState } from "react";
import { loadPaymentWidget, PaymentWidgetInstance } from "@tosspayments/payment-widget-sdk";
import { MvpButton } from "./MvpButton";
import { X } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  plan: string;
}

const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || "";

export function TossPaymentModal({ isOpen, onClose, plan }: Props) {
  // 테스트를 위해 모든 결제 금액을 100원으로 고정합니다. (원래: STUDIO 49000, PRO 19000)
  const amount = 100;
  
  const paymentWidgetRef = useRef<PaymentWidgetInstance | null>(null);
  const paymentMethodsWidgetRef = useRef<any>(null);
  const [price, setPrice] = useState(amount);
  const [isReady, setIsReady] = useState(false);
  const [customerKey, setCustomerKey] = useState("");

  useEffect(() => {
    setCustomerKey("USER_" + Math.random().toString(36).substring(2, 10));
  }, []);
  
  useEffect(() => {
    if (!isOpen || !customerKey) return;
    
    setIsReady(false);
    
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
  }, [isOpen, price, customerKey]);

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl p-5 pb-8 sm:p-8 shadow-2xl relative animate-in zoom-in-95 duration-200 max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto">
        
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-6 sm:right-6 w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">결제하기</h2>
        <p className="text-sm sm:text-base text-gray-500 mb-5 sm:mb-8 font-medium break-keep pr-8 sm:pr-0">안전한 토스페이먼츠 환경에서 결제가 진행됩니다.</p>
        
        <div className="mb-5 sm:mb-6 p-4 sm:p-5 bg-indigo-50 border border-indigo-100 rounded-2xl flex justify-between items-center">
            <span className="font-bold text-gray-600">선택한 플랜</span>
            <span className="font-black text-indigo-600 text-lg sm:text-xl tracking-tight">{plan} 플랜</span>
        </div>
        
        <div id="payment-method" className="w-full" />
        <div id="agreement" className="w-full mt-4" />
        
        <MvpButton onClick={handlePayment} disabled={!isReady} className="w-full mt-6 sm:mt-8 !py-4 text-base sm:text-lg">
          {isReady ? `${price.toLocaleString()}원 결제하기` : '결제 모듈 불러오는 중...'}
        </MvpButton>
      </div>
    </div>
  );
}
