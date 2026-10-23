"use client";

import { setLoginToken } from '../../lib/analysis-session';

import { useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { TossPaymentModal } from '../mvp/TossPaymentModal';

export function PricingSection() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState('');

  async function openPayment() {
    if (checking) return;
    const token = localStorage.getItem('accessToken');
    if (!token) {
      sessionStorage.setItem('loginReturnTo', '/pricing');
      window.location.href = '/login';
      return;
    }
    setChecking(true);
    setMessage('');
    try {
      const response = await fetch('/api/v1/users/me', { headers: { Authorization: `Bearer ${token}` } });
      if (response.status === 401) {
        setLoginToken(null);
        sessionStorage.setItem('loginReturnTo', '/pricing');
        window.location.href = '/login';
        return;
      }
      if (!response.ok) throw new Error('계정 정보를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.');
      const account = await response.json();
      if (account.plan === 'PRO' || account.plan === 'STUDIO') {
        setMessage('이미 Pro 기능을 이용할 수 있는 플랜입니다. 마이페이지에서 내 결과를 확인하세요.');
        return;
      }
      setIsModalOpen(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '계정 정보를 확인하지 못했습니다.');
    } finally {
      setChecking(false);
    }
  }

  return (
    <>
      <header className="workspace-heading pricing-heading">
        <p className="workspace-kicker">내 목소리에 맞는 이용 방식</p>
        <h1>먼저 발견하고,<br />필요한 만큼 더 깊게.</h1>
        <p className="workspace-description">가수 매칭과 추천곡은 무료로 경험하고,<br className="hidden sm:block" /> 추천 키와 더 많은 곡이 필요할 때 Pro를 선택하세요.</p>
      </header>
      <aside className="pricing-test-note"><strong>현재 테스트 결제로 운영 중입니다.</strong><p>아래는 플랜 기준 요금입니다. 현재 결제 모듈에는 테스트 금액 100원이 적용되어 있으며, 결제 전 표시 금액을 확인해주세요.</p></aside>
      <div className="pricing-plans">
        <section className="workspace-panel pricing-plan">
          <div><p className="workspace-kicker">내 목소리가 궁금할 때</p><h2>Free</h2><p className="pricing-price">0<span>원</span></p><p className="workspace-note">보컬 분석의 첫 경험</p></div>
          <ul><li><Check aria-hidden="true" /> 닮은 가수와 음색 유사도</li><li><Check aria-hidden="true" /> 분석 결과에 따른 추천곡</li><li><Check aria-hidden="true" /> 목소리 특징과 분석 기록</li></ul>
          <Link href="/analyze" className="workspace-secondary">무료로 분석 시작하기</Link>
        </section>
        <section className="workspace-panel pricing-plan pricing-plan-pro">
          <div><p className="workspace-kicker">더 많은 선택지가 필요할 때</p><h2>Pro</h2><p className="pricing-price">19,000<span>원 / 월 기준</span></p><p className="workspace-note">기본 분석에 추천 키와 추가 추천곡을 더해요</p></div>
          <ul><li><Check aria-hidden="true" /> Free의 기본 분석 기능</li><li><Check aria-hidden="true" /> 곡별 추천 키</li><li><Check aria-hidden="true" /> 추가 추천곡 플레이리스트</li></ul>
          <button className="workspace-primary" disabled={checking} onClick={openPayment}>{checking ? '계정 확인 중' : 'Pro 테스트 결제하기'}</button>
        </section>
      </div>
      {message && <div className="pricing-message" role="status"><p>{message}</p><Link href="/mypage" className="workspace-inline-link">마이페이지 보기</Link></div>}
      <section className="pricing-comparison" aria-labelledby="pricing-compare-title">
        <h2 id="pricing-compare-title" className="workspace-section-title">어떤 차이가 있나요?</h2>
        <table><caption className="sr-only">Free와 Pro 제공 기능 비교</caption><thead><tr><th scope="col">제공 기능</th><th scope="col">Free</th><th scope="col">Pro</th></tr></thead><tbody>
          <tr><th scope="row">가수 매칭 · 추천곡</th><td>제공</td><td>제공</td></tr>
          <tr><th scope="row">목소리 특징 · 분석 기록</th><td>제공</td><td>제공</td></tr>
          <tr><th scope="row">추천 키</th><td>미제공</td><td>제공</td></tr>
          <tr><th scope="row">추가 추천 플레이리스트</th><td>미제공</td><td>제공</td></tr>
        </tbody></table>
        <p className="workspace-note">분석 결과와 제공되는 세부 정보는 업로드한 음성과 분석 데이터에 따라 달라집니다. 분석이 진행 중인 동안에는 새 분석을 시작할 수 없습니다.</p>
      </section>
      <aside className="pricing-studio"><div><p className="workspace-kicker">Studio · 준비 중</p><h2>더 넓은 음악 작업을 위한 다음 단계</h2><p>아직 신청할 수 없는 플랜입니다. 제공 기능과 요금은 출시 시 안내하겠습니다.</p></div><button className="workspace-secondary" disabled>준비 중</button></aside>
      <TossPaymentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} plan="PRO" />
    </>
  );
}
