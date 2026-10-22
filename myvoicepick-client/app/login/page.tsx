'use client';

import { loginDestination } from '../../lib/analysis-session';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import '../../styles/mvp-design.css';
import '../../styles/workspace.css';
import { MvpNav } from '../../components/mvp/MvpNav';
import { MvpFooter } from '../../components/mvp/MvpFooter';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    if (localStorage.getItem('accessToken')) {
      const destination = loginDestination(sessionStorage.getItem('loginReturnTo'));
      sessionStorage.removeItem('loginReturnTo');
      router.replace(destination);
    }
  }, [router]);

  return (
    <div className="mvp-canvas workspace-page min-h-screen flex flex-col">
      <MvpNav />
      <main className="workspace-login">
        <p className="workspace-kicker">나의 보컬 기록을 한곳에</p>
        <h1>내 목소리의 발견을<br />이어가세요.</h1>
        <p className="workspace-description">로그인하고 분석을 시작하세요.<br />분석 결과는 마이페이지에서 다시 확인할 수 있어요.</p>
        <div className="workspace-socials">
              {/* Naver */}
              <Link href={`${process.env.NEXT_PUBLIC_BACKEND_URL}/oauth2/authorization/naver`} className="workspace-social workspace-naver" title="Naver Login">
                <span className="text-white font-black text-xl">N</span><span>네이버로 계속하기</span>
              </Link>
              {/* Kakao */}
              <Link href={`${process.env.NEXT_PUBLIC_BACKEND_URL}/oauth2/authorization/kakao`} className="workspace-social workspace-kakao" title="Kakao Login">
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-[#3C1E1E]">
                  <path d="M12 3c-4.97 0-9 3.185-9 7.115 0 2.558 1.707 4.8 4.337 6.136l-.81 2.965c-.1.37.125.74.493.74.156 0 .313-.056.442-.17l3.473-2.316c.35.04.706.06 1.065.06 4.97 0 9-3.185 9-7.115S16.97 3 12 3z" />
                </svg><span>카카오로 계속하기</span>
              </Link>
              {/* Google */}
              <Link href={`${process.env.NEXT_PUBLIC_BACKEND_URL}/oauth2/authorization/google`} className="workspace-social workspace-google" title="Google Login">
                <svg viewBox="0 0 24 24" className="w-6 h-6">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg><span>Google로 계속하기</span>
              </Link>
        </div>
        <p className="workspace-note">이메일과 비밀번호 입력 없이 소셜 계정으로 로그인합니다.</p>
      </main>
      <MvpFooter />
    </div>
  );
}
