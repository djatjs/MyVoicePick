'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import '../../styles/mvp-design.css';
import { MvpNav } from '../../components/mvp/MvpNav';
import { MvpFooter } from '../../components/mvp/MvpFooter';
import { MvpButton } from '../../components/mvp/MvpButton';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    if (localStorage.getItem('accessToken')) {
      router.replace('/mypage');
    }
  }, [router]);

  return (
    <main className="mvp-canvas min-h-screen flex flex-col">
      <MvpNav />
      
      <div className="flex-1 flex items-center justify-center p-6 py-20">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <Link href="/" className="inline-flex items-center gap-2 mb-2 group">
              <div className="w-10 h-10 bg-gradient-to-tr from-[var(--mvp-primary)] to-[var(--mvp-secondary)] rounded-xl flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform">
                 <svg viewBox="0 0 24 24" className="w-6 h-6 text-white fill-current">
                   <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                 </svg>
              </div>
              <span className="text-2xl font-bold tracking-tighter mvp-title text-white">MyVoicePick</span>
            </Link>
          </div>

          <div className="mvp-glass-card p-8 space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-[var(--mvp-text-muted)]">Email Address</label>
              <input 
                type="email" 
                placeholder="name@example.com"
                className="w-full bg-white/5 border border-white/10 rounded-[var(--mvp-radius-sm)] px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-xs font-bold uppercase tracking-widest text-[var(--mvp-text-muted)]">Password</label>
                <Link href="#" className="text-xs text-indigo-400 hover:underline">Forgot password?</Link>
              </div>
              <input 
                type="password" 
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-[var(--mvp-radius-sm)] px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <MvpButton variant="primary" className="w-full py-4">Sign In</MvpButton>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/5"></span></div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-[0.2em]"><span className="bg-[#1e293b] px-4 text-[var(--mvp-text-muted)]">소셜 계정으로 간편 로그인</span></div>
            </div>

            <div className="flex justify-center gap-6 py-2">
               {/* Naver */}
               <Link href="http://localhost:8080/oauth2/authorization/naver" className="w-12 h-12 rounded-full bg-[#03C75A] flex items-center justify-center transition-opacity hover:opacity-80 shadow-lg" title="Naver Login">
                  <span className="text-white font-black text-xl">N</span>
               </Link>
               {/* Kakao */}
               <Link href="http://localhost:8080/oauth2/authorization/kakao" className="w-12 h-12 rounded-full bg-[#FEE500] flex items-center justify-center transition-opacity hover:opacity-80 shadow-lg" title="Kakao Login">
                  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-[#3C1E1E]">
                     <path d="M12 3c-4.97 0-9 3.185-9 7.115 0 2.558 1.707 4.8 4.337 6.136l-.81 2.965c-.1.37.125.74.493.74.156 0 .313-.056.442-.17l3.473-2.316c.35.04.706.06 1.065.06 4.97 0 9-3.185 9-7.115S16.97 3 12 3z"/>
                  </svg>
               </Link>
               {/* Google */}
               <Link href="http://localhost:8080/oauth2/authorization/google" className="w-12 h-12 rounded-full bg-white flex items-center justify-center transition-opacity hover:opacity-80 shadow-lg" title="Google Login">
                  <svg viewBox="0 0 24 24" className="w-6 h-6">
                     <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                     <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                     <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"/>
                     <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
               </Link>
            </div>
          </div>

          <p className="text-center mt-8 text-sm text-[var(--mvp-text-muted)]">
            Don't have an account? <Link href="/signup" className="text-indigo-400 font-bold hover:underline">Sign up</Link>
          </p>
        </div>
      </div>

      <MvpFooter />
    </main>
  );
}
