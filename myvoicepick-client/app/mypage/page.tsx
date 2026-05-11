'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MvpNav } from '../../components/mvp/MvpNav';
import { MvpFooter } from '../../components/mvp/MvpFooter';
import { MvpButton } from '../../components/mvp/MvpButton';
import { Activity, History, Mic2, Music, BarChart3, ChevronRight, Clock, Star, Zap, ShieldCheck } from 'lucide-react';
import '../../styles/mvp-design.css';
import ProfileHeader from '../../components/mypage/ProfileHeader';
import CoreInsights from '../../components/mypage/CoreInsights';
import ProInsights from '../../components/mypage/ProInsights';

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
          const data = await resLatest.json();
          if (data && data.status === 'COMPLETED') {
            setLatestAnalysis(data);
            if (data.userPlan) setUserPlan(data.userPlan);
          }
        }

        // 2. 분석 이력 가져오기
        const resHistory = await fetch('/api/v1/analyze/my-history', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (resHistory.ok) {
          const data = await resHistory.json();
          setHistory(data || []);
        }
      } catch (e) {
        console.error('Error fetching mypage data', e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMyData();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen mvp-canvas flex items-center justify-center">
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

      <div className="flex-1 max-w-7xl w-full mx-auto p-6 py-16 lg:py-24 space-y-20 relative z-10 animate-fade-in">

        <ProfileHeader userEmail={userEmail} userPlan={userPlan} />

        {/* Core Insights Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Main Visual Profile */}
          <div className="lg:col-span-8 mvp-glass-card p-12 relative overflow-hidden flex flex-col md:flex-row gap-12 group">
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px] -mr-48 -mt-48 group-hover:bg-indigo-500/10 transition-all duration-700"></div>

            <CoreInsights latestAnalysis={latestAnalysis} statLabels={statLabels} />

            <ProInsights latestAnalysis={latestAnalysis} userPlan={userPlan} />
          </div>

          {/* Side Widget: History Overview */}
          <div className="lg:col-span-4 space-y-6">
            <div className="flex items-center justify-between px-2">
              <h4 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-400" /> Session History
              </h4>
            </div>

            <div className="space-y-3">
              {history.length > 0 ? history.slice(0, 4).map((task) => (
                <Link key={task.taskId} href={`/analyze?taskId=${task.taskId}`} className="block mvp-glass-card p-5 hover:bg-white/10 transition-all group">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="text-sm font-black text-white group-hover:text-indigo-400 transition-colors">{task.vocalPersona || "Analysis"}</div>
                      <div className="text-[10px] font-bold text-white/30 flex items-center gap-2">
                        <Music className="w-3 h-3" /> {task.matchedSongTitle || "-"}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-white transition-all" />
                  </div>
                </Link>
              )) : (
                <div className="p-10 border border-dashed border-white/5 rounded-3xl text-center">
                  <p className="text-[10px] font-black text-white/10 uppercase tracking-widest">No previous sessions</p>
                </div>
              )}
            </div>

            {/* Upgrade Banner for FREE users */}
            {userPlan === 'FREE' && (
              <div className="p-8 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl shadow-xl shadow-indigo-500/20 relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-all duration-700"></div>
                <Zap className="w-8 h-8 text-white mb-4" />
                <h4 className="text-lg font-black text-white mb-2 tracking-tight">Go Pro.</h4>
                <p className="text-white/70 text-xs font-medium leading-relaxed mb-6 break-keep">
                  128포인트 정밀 DNA 분석과 전용 보컬 트레이닝 가이드를 무제한으로 이용하세요.
                </p>
                <MvpButton className="w-full bg-white text-indigo-600 hover:bg-white/90 text-xs font-black py-3 rounded-xl">Upgrade Now</MvpButton>
              </div>
            )}
          </div>
        </section>

      </div>

      <MvpFooter />
    </main>
  );
}
