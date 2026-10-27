"use client";

import { setLoginToken } from '../../lib/analysis-session';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MvpNav } from '../../components/mvp/MvpNav';
import { MvpFooter } from '../../components/mvp/MvpFooter';
import { Trash2 } from 'lucide-react';
import '../../styles/mvp-design.css';
import '../../styles/workspace.css';

import ProfileHeader from '../../components/mypage/ProfileHeader';
import CoreInsights from '../../components/mypage/CoreInsights';
import ProInsights from '../../components/mypage/ProInsights';

interface LatestAnalysis {
  taskId: string;
  status: string;
  matchedSongTitle?: string;
  matchedArtist?: string;
  similarityScore?: number;
  vocalStats?: { similar_artists?: string[] };
  createdAt?: string;
}

export default function MyPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [latestAnalysis, setLatestAnalysis] = useState<LatestAnalysis | null>(null);
  const [history, setHistory] = useState<LatestAnalysis[]>([]);
  const [userPlan, setUserPlan] = useState<string>('');
  const [loadError, setLoadError] = useState('');
  const [revision, setRevision] = useState(0);

  const handleDeleteHistory = async (e: React.MouseEvent, taskId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm('정말로 이 분석 이력을 삭제하시겠습니까?')) return;

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    try {
      const res = await fetch(`/api/v1/analyses/${encodeURIComponent(taskId)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        setHistory(prev => prev.filter(task => task.taskId !== taskId));
        setRevision(value => value + 1);
      } else {
        alert('삭제 중 오류가 발생했습니다.');
      }
    } catch (e) {
      console.error('Failed to delete history', e);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.replace('/login');
      return;
    }

    const fetchMyData = async () => {
      setLoadError('');
      try {
        const accountResponse = await fetch('/api/v1/users/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (accountResponse.status === 401) { setLoginToken(null); router.replace('/login'); return; }
        if (!accountResponse.ok) throw new Error('계정 정보를 불러오지 못했습니다.');
        const account = await accountResponse.json();
        setUserEmail(account.email);
        setUserPlan(account.plan);

        // 내 분석 목록(최신순). 맨 앞이 가장 최근 분석이다
        const resAnalyses = await fetch('/api/v1/analyses', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (resAnalyses.status === 401) { setLoginToken(null); router.replace('/login'); return; }
        if (!resAnalyses.ok) throw new Error('분석 기록을 불러오지 못했습니다.');
        const analyses = await resAnalyses.json();
        setHistory(analyses);
        setLatestAnalysis(analyses[0]?.status === 'COMPLETED' ? analyses[0] : null);
      } catch (e) {
        console.error('Error fetching mypage data', e);
        setLoadError('기록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMyData();
  }, [router, revision]);


  return (
    <div className="mvp-canvas workspace-page min-h-screen flex flex-col">
      <MvpNav />
      <main className="workspace-container workspace-records">
        <ProfileHeader userEmail={userEmail} userPlan={userPlan} />
        {isLoading ? <div className="workspace-panel workspace-empty" role="status">나의 보컬 기록을 불러오고 있어요.</div> : loadError ? <div className="workspace-panel workspace-empty" role="alert"><h2>기록을 불러오지 못했어요</h2><p>{loadError}</p><button className="workspace-secondary" onClick={() => setRevision(value => value + 1)}>다시 불러오기</button></div> : <>
          {latestAnalysis ? <section className="workspace-result-grid"><CoreInsights latestAnalysis={latestAnalysis} /><ProInsights latestAnalysis={latestAnalysis} /></section> : <section className="workspace-panel workspace-empty"><h2>{history.length ? '아직 완료된 분석이 없어요' : '첫 번째 목소리 기록을 남겨보세요'}</h2><p>{history.length ? '아래 기록에서 진행 상태를 확인하거나 새 분석을 시작하세요.' : '노래한 파일을 올리면 닮은 가수와 추천곡을 확인할 수 있어요.'}</p><Link href="/analyze" className="workspace-primary">첫 분석 시작하기</Link></section>}
          <section className="workspace-history"><div className="workspace-history-heading"><h2>분석 기록</h2><span>{history.length}건</span></div>
            {history.length ? <ul>{history.map(task => <li key={task.taskId}>
              <Link className="workspace-history-link" href={`/analyze?taskId=${encodeURIComponent(task.taskId)}`}><div><h3>{task.matchedSongTitle || '음성 분석'}</h3><p>{task.matchedArtist || '결과를 확인해주세요'}{task.createdAt && <> · <time dateTime={task.createdAt}>{new Date(task.createdAt).toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' })}</time></>}</p></div><span className="workspace-status">{task.status === 'COMPLETED' ? '분석 완료' : task.status === 'FAILED' ? '분석 실패' : task.status === 'PENDING' ? '분석 대기' : '분석 중'}</span><span className="workspace-history-action">결과 보기</span></Link>
              <button className="workspace-delete" onClick={event => handleDeleteHistory(event, task.taskId)} aria-label={`${task.matchedSongTitle || '음성 분석'} 기록 삭제`}><Trash2 size={17} aria-hidden="true" /></button>
            </li>)}</ul> : <p className="workspace-empty">아직 저장된 분석 기록이 없습니다.</p>}
          </section>
        </>}
        {userPlan && <aside className="workspace-plan"><div><h2>현재 {userPlan} 플랜을 이용하고 있어요</h2><p>제공 기능과 이용 요금은 요금제 페이지에서 확인할 수 있습니다.</p></div><Link href="/pricing" className="workspace-inline-link">요금제 비교하기</Link></aside>}
      </main>
      <MvpFooter />
    </div>
  );
}
