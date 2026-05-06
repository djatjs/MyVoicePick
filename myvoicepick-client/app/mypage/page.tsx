'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MvpNav } from '../../components/mvp/MvpNav';
import { MvpFooter } from '../../components/mvp/MvpFooter';
import { MvpButton } from '../../components/mvp/MvpButton';
import { Activity, History, Mic2, Music, BarChart3, ChevronRight, Clock, Star, Zap, ShieldCheck } from 'lucide-react';
import '../../styles/mvp-design.css';

interface VocalStats {
  warmth: number;
  clarity: number;
  power: number;
  rhythm: number;
  emotion: number;
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

        {/* Profile Header */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/5 pb-12">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                <Star className="w-3 h-3" /> {userPlan} Member
              </div>
            </div>
            <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter">
              {userEmail?.split('@')[0]}<span className="text-white/20">.studio</span>
            </h1>
            <p className="text-[var(--mvp-text-muted)] text-xl font-medium max-w-2xl">
              분석된 보컬 페르소나는 <span className="text-white font-bold">기록</span>되고, 음악적 가능성은 <span className="text-white font-bold">확장</span>됩니다.
            </p>
          </div>
          <div className="flex gap-4">
            <Link href="/analyze">
              <MvpButton className="h-14 px-8 text-sm font-black uppercase tracking-widest shadow-[0_8px_20px_rgba(99,102,241,0.3)]">
                Launch Analysis
              </MvpButton>
            </Link>
          </div>
        </section>

        {/* Core Insights Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Main Visual Profile */}
          <div className="lg:col-span-8 mvp-glass-card p-12 relative overflow-hidden flex flex-col md:flex-row gap-12 group">
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px] -mr-48 -mt-48 group-hover:bg-indigo-500/10 transition-all duration-700"></div>

            {/* Left side: Persona Info */}
            <div className="flex-1 space-y-10 relative z-10">
              <div className="space-y-2">
                <h3 className="text-xs font-black text-emerald-400 uppercase tracking-[0.4em]">Current Identity</h3>
                <div className="text-5xl font-black text-white tracking-tighter leading-none">
                  {latestAnalysis?.vocalPersona || "Ready to Start"}
                </div>
              </div>

              {latestAnalysis ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                  {Object.entries(latestAnalysis.vocalStats || {}).map(([key, val]) => (
                    <div key={key} className="space-y-2">
                      <div className="flex justify-between items-end">
                        <span className="text-[11px] font-black text-white/40 uppercase tracking-widest">{statLabels[key as keyof typeof statLabels] || key}</span>
                        <span className="text-sm font-black text-white">{val}%</span>
                      </div>
                      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-right from-emerald-500 to-teal-400 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.4)]" style={{ width: `${val}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 bg-white/[0.02] border border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center text-center">
                  <p className="text-white/20 font-black uppercase tracking-widest mb-4">No DNA Data Detected</p>
                  <Link href="/analyze" className="text-xs font-bold text-indigo-400 hover:underline">Start Your First Session &rarr;</Link>
                </div>
              )}
            </div>

            {/* Right side: Recommendation Quick Look */}
            <div className="md:w-64 flex flex-col justify-between p-8 bg-white/[0.03] rounded-[32px] border border-white/5 relative z-10">
              <div className="space-y-6">
                <div className="w-12 h-12 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-400 border border-rose-500/20">
                  <Music className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Recommended</p>
                  <p className="text-lg font-black text-white leading-tight">{latestAnalysis?.matchedSongTitle || "N/A"}</p>
                  <p className="text-xs font-bold text-white/30">{latestAnalysis?.matchedArtist || "N/A"}</p>
                </div>
              </div>
              {latestAnalysis && (
                <Link href={`/analyze?taskId=${latestAnalysis.taskId}`} className="mt-8 py-3 bg-white/5 rounded-xl text-[10px] font-black text-white/40 hover:text-white hover:bg-indigo-500 text-center transition-all uppercase tracking-widest">
                  View Analysis
                </Link>
              )}
            </div>
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
                <p className="text-white/70 text-xs font-medium leading-relaxed mb-6">
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
