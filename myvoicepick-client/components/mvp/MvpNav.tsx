import React from 'react';
import Link from 'next/link';
import { MvpButton } from './MvpButton';

export const MvpNav: React.FC = () => {
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
          <Link href="/features" className="hover:text-white transition-colors">Features</Link>
          <Link href="/guide" className="hover:text-white transition-colors">Guide</Link>
          <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Link href="/login">
          <MvpButton variant="ghost" size="md" className="hidden sm:inline-flex">Log In</MvpButton>
        </Link>
        <Link href="/analyze">
          <MvpButton variant="primary" size="md">Get Started</MvpButton>
        </Link>
      </div>
    </nav>
  );
};
