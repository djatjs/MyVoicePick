export function paymentConfirmation(paymentKey: string | null, orderId: string | null, amount: string | null, plan: string | null) {
  const total = Number(amount);
  if (!paymentKey || !orderId || !Number.isSafeInteger(total) || total <= 0 || (plan !== 'PRO' && plan !== 'STUDIO')) return null;
  return { paymentKey, orderId, amount: total, plan };
}
