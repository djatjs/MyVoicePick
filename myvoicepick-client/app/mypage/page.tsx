'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MvpNav } from '../../components/mvp/MvpNav';
import { MvpFooter } from '../../components/mvp/MvpFooter';
import { MvpButton } from '../../components/mvp/MvpButton';
import { Activity, History, Mic2, Music, BarChart3, ChevronRight, Clock, Star, Zap, ShieldCheck, Trash2 } from 'lucide-react';
import '../../styles/mvp-design.css';

import ProfileHeader from '../../components/mypage/ProfileHeader';
import CoreInsights from '../../components/mypage/CoreInsights';
import ProInsights from '../../components/mypage/ProInsights';
import { TossPaymentModal } from '../../components/mvp/TossPaymentModal';

interface VocalStats {
  warmth: number;
  clarity: number;
  power: number;
  rhythm: number;
  emotion: number;
}

interface ProFeatures {
  key?: string;
  guide?: string;
}

interface LatestAnalysis {
  taskId: string;
  status: string;
  vocalPersona?: string;
  vocalStats?: VocalStats;
  matchedSongTitle?: string;
  matchedArtist?: string;
  recommendReason?: string;
  userPlan?: string;
  similarityScore?: number;
  proFeatures?: ProFeatures;
}

export default function MyPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [latestAnalysis, setLatestAnalysis] = useState<LatestAnalysis | null>(null);
  const [history, setHistory] = useState<LatestAnalysis[]>([]);
  const [userPlan, setUserPlan] = useState<string>('FREE');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('PRO');

  const handlePaymentClick = (plan: string) => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      alert('로그인이 필요한 서비스입니다. 로그인 페이지로 이동합니다.');
      window.location.href = '/login';
      return;
    }
    setSelectedPlan(plan);
    setIsModalOpen(true);
  };

  const handleDeleteHistory = async (e: React.MouseEvent, taskId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm('정말로 이 분석 이력을 삭제하시겠습니까?')) return;

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    try {
      const res = await fetch(`/api/v1/analyze/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        setHistory(prev => prev.filter(task => task.taskId !== taskId));
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
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        const payload = JSON.parse(jsonPayload);
        setUserEmail(payload.sub);

        // 1. 최신 분석 결과 가져오기
        const resLatest = await fetch('/api/v1/analyze/my-latest', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (resLatest.ok) {
          const text = await resLatest.text();
          if (text) {
            const data = JSON.parse(text);
            if (data && data.status === 'COMPLETED') {
              setLatestAnalysis(data);
              if (data.userPlan) setUserPlan(data.userPlan);
            }
          }
        }

        // 2. 분석 이력 가져오기
        const resHistory = await fetch('/api/v1/analyze/my-history', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (resHistory.ok) {
          const text = await resHistory.text();
          if (text) {
            const data = JSON.parse(text);
            setHistory(data || []);
          }
        }
      } catch (e) {
        console.error('Error fetching mypage data', e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMyData();
  }, [router]);

  useEffect(() => {
    // 페이지 진입 시 무조건 최상단으로 스크롤
    if (!isLoading) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen mvp-canvas flex items-center justify-center animate-in fade-in duration-1000">
        <div className="text-white flex flex-col items-center gap-6">
          <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin shadow-[0_0_20px_rgba(99,102,241,0.4)]" />
          <p className="font-bold tracking-[0.2em] text-indigo-400 uppercase text-xs">Accessing Studio Canvas...</p>
        </div>
      </div>
    );
  }

  const statLabels = {
    warmth: "따뜻함",
    clarity: "선명도",
    power: "성량",
    rhythm: "리듬감",
    emotion: "표현력"
  };

  return (
    <main className="mvp-canvas min-h-screen flex flex-col relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-fuchsia-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <MvpNav />

      <div className="flex-1 max-w-7xl w-full mx-auto p-6 py-16 lg:py-24 space-y-20 relative z-10">

        <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <ProfileHeader userEmail={userEmail} userPlan={userPlan} />
        </div>

        {/* Top Insights Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-150">
          {/* Main Visual Profile */}
          <div className="lg:col-span-8 mvp-glass-card p-10 md:p-12 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px] -mr-48 -mt-48 group-hover:bg-indigo-500/10 transition-all duration-700"></div>
            <CoreInsights latestAnalysis={latestAnalysis} statLabels={statLabels} />
          </div>

          <div className="lg:col-span-4 flex">
            <ProInsights latestAnalysis={latestAnalysis} userPlan={userPlan} />
          </div>
        </section>

        {/* Session History Section */}
        <section className="space-y-8 pt-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <h4 className="text-xl font-black text-white tracking-tighter flex items-center gap-3">
              <History className="w-6 h-6 text-indigo-400" /> Session History
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {history.length > 0 ? history.map((task) => (
              <Link key={task.taskId} href={`/analyze?taskId=${task.taskId}`} className="block bg-slate-900/40 p-6 hover:bg-slate-800 transition-all group border border-slate-700/50 rounded-[24px] shadow-lg relative overflow-hidden backdrop-blur-md">
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                  <button 
                    onClick={(e) => handleDeleteHistory(e, task.taskId)}
                    className="p-2 rounded-xl bg-red-500/10 text-white/30 hover:text-red-400 hover:bg-red-500/20 transition-all backdrop-blur-sm"
                    title="이력 삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3 relative z-10">
                  <div className="text-lg font-black text-white group-hover:text-indigo-400 transition-colors pr-8 leading-tight">
                    {task.vocalPersona || "Vocal Analysis DNA"}
                  </div>
                  <div className="text-xs font-bold text-white/40 flex items-center gap-2">
                    <Music className="w-3.5 h-3.5 text-emerald-400" /> {task.matchedSongTitle || "N/A"}
                  </div>
                </div>
                <div className="mt-8 flex items-center justify-between text-[10px] font-black text-white/20 uppercase tracking-widest relative z-10">
                  <span className={task.status === 'COMPLETED' ? 'text-emerald-500/50' : 'text-amber-500/50'}>{task.status}</span>
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-all">
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </Link>
            )) : (
              <div className="col-span-full py-20 border border-dashed border-white/10 rounded-[32px] text-center bg-slate-900/20 backdrop-blur-sm">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                  <History className="w-6 h-6 text-white/20" />
                </div>
                <p className="text-sm font-black text-white/40 uppercase tracking-widest">No previous sessions found</p>
                <p className="text-xs text-white/20 mt-2 font-medium">Your vocal DNA records will appear here.</p>
              </div>
            )}
          </div>
        </section>

        {/* Upgrade Banner for FREE users */}
        {userPlan === 'FREE' && (
          <div className="mt-12 p-10 md:p-12 bg-gradient-to-r from-indigo-900/80 via-violet-900/60 to-slate-900/80 border border-indigo-500/30 rounded-[32px] shadow-[0_20px_40px_rgba(99,102,241,0.15)] relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 backdrop-blur-xl group animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
            <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] group-hover:bg-fuchsia-500/20 transition-all duration-1000"></div>
            <div className="relative z-10 flex-1 flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-400 to-fuchsia-400 rounded-2xl flex items-center justify-center shadow-lg rotate-3 group-hover:rotate-6 transition-transform">
                <Zap className="w-8 h-8 text-white -rotate-3 group-hover:-rotate-6 transition-transform" />
              </div>
              <div>
                <h4 className="text-3xl font-black text-white mb-2 tracking-tighter drop-shadow-md">Unlock Studio PRO.</h4>
                <p className="text-white/70 text-sm font-medium leading-relaxed max-w-xl">
                  128포인트 정밀 DNA 분석부터, 취약점을 보완하는 전용 1:1 보컬 트레이닝 가이드까지.<br/>PRO 멤버십으로 한계 없는 성장을 경험하세요.
                </p>
              </div>
            </div>
            <div className="relative z-10 w-full md:w-auto">
              <MvpButton className="w-full md:w-auto h-14 px-10 bg-white text-black hover:bg-gray-200 text-sm font-black rounded-2xl uppercase tracking-widest shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-105 transition-all" onClick={() => handlePaymentClick('PRO')}>
                Upgrade Now
              </MvpButton>
            </div>
          </div>
        )}
      </div>

      <MvpFooter />
      
      <TossPaymentModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        plan={selectedPlan} 
      />
    </main>
  );
}
