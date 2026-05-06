'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MvpButton } from './MvpButton';

export const MvpNav: React.FC = () => {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // 클라이언트 마운트 후 토큰 여부 확인
    const token = localStorage.getItem('accessToken');
    setIsLoggedIn(!!token);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    setIsLoggedIn(false);
    router.push('/');
  };

  return (
    <nav className="h-[80px] bg-[var(--mvp-bg)]/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-8 sticky top-0 z-50">
      <div className="flex items-center gap-12">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 bg-gradient-to-tr from-[var(--mvp-primary)] to-[var(--mvp-secondary)] rounded-xl flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform">
             <svg viewBox="0 0 24 24" className="w-6 h-6 text-white fill-current">
               <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
             </svg>
          </div>
          <span className="text-2xl font-bold tracking-tighter mvp-title">MyVoicePick</span>
        </Link>
        <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-[var(--mvp-text-muted)]">
          <Link href="/#features" className="hover:text-white transition-colors">Features</Link>
          <Link href="/#guide" className="hover:text-white transition-colors">Guide</Link>
          <Link href="/#pricing" className="hover:text-white transition-colors">Pricing</Link>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {isLoggedIn ? (
          <>
            <Link href="/mypage">
              <MvpButton variant="ghost" size="md" className="hidden sm:inline-flex text-indigo-400">마이페이지</MvpButton>
            </Link>
            <MvpButton variant="outline" size="md" onClick={handleLogout}>로그아웃</MvpButton>
          </>
        ) : (
          <>
            <Link href="/login">
              <MvpButton variant="ghost" size="md" className="hidden sm:inline-flex">Log In</MvpButton>
            </Link>
            <Link href="/analyze">
              <MvpButton variant="primary" size="md">Get Started</MvpButton>
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};
