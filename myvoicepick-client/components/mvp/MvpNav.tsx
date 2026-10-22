'use client';

import React, { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { MvpButton } from './MvpButton';
import { hasLoginToken, subscribeToLogin, setLoginToken } from '../../lib/analysis-session';

const NAV_LINKS = [
  { href: '/#features', label: '분석 소개' },
  { href: '/#guide', label: '이용 방법' },
  { href: '/#pricing', label: '요금제' },
];

export const MvpNav: React.FC = () => {
  const router = useRouter();
  const isLoggedIn = useSyncExternalStore(subscribeToLogin, hasLoginToken, () => false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const closeMenu = () => setIsMenuOpen(false);

  const handleLogout = () => {
    setLoginToken(null);
    closeMenu();
    router.push('/');
  };

  return (
    <nav className="h-16 md:h-[80px] bg-[var(--mvp-bg)]/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-4 md:px-8 sticky top-0 z-50">
      <div className="flex items-center gap-12">
        <Link href="/" className="flex items-center gap-2 group" onClick={closeMenu}>
          <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-tr from-[var(--mvp-primary)] to-[var(--mvp-secondary)] rounded-lg md:rounded-xl flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform">
             <svg viewBox="0 0 24 24" className="w-5 h-5 md:w-6 md:h-6 text-white fill-current">
               <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
             </svg>
          </div>
          <span className="text-xl md:text-2xl font-bold tracking-tighter mvp-title">MyVoicePick</span>
        </Link>
        <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-[var(--mvp-text-muted)]">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-white transition-colors">{link.label}</Link>
          ))}
        </div>
      </div>

      {/* 데스크탑 액션 */}
      <div className="hidden md:flex items-center gap-4">
        {isLoggedIn ? (
          <>
            <Link href="/mypage">
              <MvpButton variant="ghost" size="md" className="text-indigo-400">마이페이지</MvpButton>
            </Link>
            <MvpButton variant="outline" size="md" onClick={handleLogout}>로그아웃</MvpButton>
          </>
        ) : (
          <>
            <Link href="/login">
              <MvpButton variant="ghost" size="md">로그인</MvpButton>
            </Link>
            <Link href="/analyze">
              <MvpButton variant="primary" size="md">내 목소리 분석하기</MvpButton>
            </Link>
          </>
        )}
      </div>

      {/* 모바일 메뉴 토글 */}
      <button
        type="button"
        className="md:hidden w-11 h-11 -mr-2 flex items-center justify-center rounded-xl text-white hover:bg-white/5 transition-colors"
        aria-label={isMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
        aria-expanded={isMenuOpen}
        onClick={() => setIsMenuOpen((prev) => !prev)}
      >
        {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* 모바일 메뉴 패널 */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-[var(--mvp-bg)] border-b border-white/10 shadow-2xl px-4 pt-2 pb-5">
          <div className="flex flex-col text-base font-semibold text-[var(--mvp-text-muted)]">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} onClick={closeMenu} className="py-3.5 border-b border-white/5 hover:text-white transition-colors">
                {link.label}
              </Link>
            ))}
            {isLoggedIn ? (
              <Link href="/mypage" onClick={closeMenu} className="py-3.5 border-b border-white/5 text-indigo-400">마이페이지</Link>
            ) : (
              <Link href="/login" onClick={closeMenu} className="py-3.5 border-b border-white/5 hover:text-white transition-colors">로그인</Link>
            )}
          </div>
          <div className="mt-5">
            {isLoggedIn ? (
              <MvpButton variant="outline" size="md" className="w-full" onClick={handleLogout}>로그아웃</MvpButton>
            ) : (
              <Link href="/analyze" onClick={closeMenu} className="block">
                <MvpButton variant="primary" size="md" className="w-full">내 목소리 분석하기</MvpButton>
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
