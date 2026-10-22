'use client';

import { loginDestination } from '../../../lib/analysis-session';
import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');

    if (token) {
      localStorage.setItem('accessToken', token);
      const destination = loginDestination(sessionStorage.getItem('loginReturnTo'));
      sessionStorage.removeItem('loginReturnTo');
      router.replace(destination);
    } else {
      router.replace('/login');
    }
  }, [searchParams, router]);

  // 아무 화면도 보여주지 않고 즉시 리다이렉트
  return null;
}

export default function LoginSuccessPage() {
  return (
    <Suspense fallback={null}>
      <LoginSuccessContent />
    </Suspense>
  );
}
