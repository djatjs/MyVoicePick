'use client';

import { loginDestination, setLoginToken } from '../../../lib/analysis-session';
import '../../../styles/mvp-design.css';
import '../../../styles/workspace.css';
import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');

    if (token) {
      setLoginToken(token);
      const destination = loginDestination(sessionStorage.getItem('loginReturnTo'));
      sessionStorage.removeItem('loginReturnTo');
      router.replace(destination);
    } else {
      router.replace('/login');
    }
  }, [searchParams, router]);

  return <div className="mvp-canvas workspace-page min-h-screen flex items-center justify-center"><p role="status" className="workspace-description">로그인을 확인하고 있어요. 잠시만 기다려주세요.</p></div>;
}

export default function LoginSuccessPage() {
  return (
    <Suspense fallback={<p role="status">로그인을 확인하고 있어요.</p>}>
      <LoginSuccessContent />
    </Suspense>
  );
}
