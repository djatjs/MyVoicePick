"use client";

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { PaymentCheckout } from './PaymentCheckout';

export function TossPaymentModal({ isOpen, onClose, plan }: { isOpen: boolean; onClose: () => void; plan: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (isOpen) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [isOpen]);
  if (!isOpen) return null;
  return (
    <dialog ref={dialogRef} className="payment-dialog" aria-labelledby="payment-title" onCancel={onClose}>
      <button className="payment-close" onClick={onClose} aria-label="결제 창 닫기"><X size={22} aria-hidden="true" /></button>
      <PaymentCheckout plan={plan === 'STUDIO' ? 'STUDIO' : 'PRO'} amount={100} />
    </dialog>
  );
}
