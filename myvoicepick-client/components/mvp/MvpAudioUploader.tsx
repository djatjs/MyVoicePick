'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  UploadCloud, Loader2, AlertCircle, CheckCircle2,
  Music, Mic2, Sparkles, RotateCcw, Flame, Zap, Wind, Heart, Activity, Play,
  Target, Stethoscope, ListMusic, PlayCircle, Crown, Wand2
} from 'lucide-react';
import { MvpButton } from './MvpButton';

type UploadState = 'idle' | 'dragging' | 'uploading' | 'success' | 'error';

interface VocalStats {
  warmth: number;
  clarity: number;
  power: number;
  rhythm: number;
  emotion: number;
  dna_128_points?: number[]; // [신규] 128포인트 DNA 데이터
}

interface MatchResult {
  title: string;
  artist: string;
  albumCoverUrl?: string;
  previewUrl?: string;
  voiceTags?: string[];
  similarityScore?: number;
  pitchHz?: number;
  recommendReason?: string;
  vocalPersona?: string;
  vocalStats?: VocalStats;
  userPlan?: string;
  proFeatures?: ProFeatures;
}

function StatBar({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-[var(--mvp-text-muted)]">
          {icon}
          <span className="font-medium">{label}</span>
        </div>
        <span className="font-bold text-[var(--mvp-text-main)]">{value}</span>
      </div>
      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out ${color} shadow-[0_0_8px_currentColor]`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

/**
 * [업데이트] 보컬 시그니처 파형 (일반 유저 친화적 설명 추가)
 */
function VocalDnaChart({ data }: { data: number[] }) {
  const displayData = data && data.length === 128 ? data : Array(128).fill(20);
  
  const getAnimation = (i: number) => {
    if (i % 3 === 0) return 'animate-[eq-pulse-1_1.5s_ease-in-out_infinite_alternate]';
    if (i % 5 === 0) return 'animate-[eq-pulse-2_1.2s_ease-in-out_infinite_alternate]';
    return 'animate-[eq-pulse-3_2s_ease-in-out_infinite_alternate]';
  };

  return (
    <div className="relative mt-8 rounded-[var(--mvp-radius-lg)] bg-[#050505] border border-white/5 overflow-hidden">
      <div className="p-8 pb-0 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-black text-white flex items-center gap-2 mb-2 tracking-tight">
            <Activity className="w-5 h-5 text-indigo-400" />
            Vocal Signature Waveform
          </h3>
          <p className="text-sm text-white/60 font-medium leading-relaxed max-w-xl">
            지문처럼 사람마다 다른 고유한 목소리의 주파수 파형입니다.<br/>
            MyVoicePick AI는 이 128개의 스펙트럼 데이터를 기반으로 당신과 가장 유사한 프로 가수를 정밀하게 찾아냈습니다.
          </p>
        </div>
      </div>
      <div className="p-8 pt-8">
        <div className="relative flex items-end gap-[1px] h-32 sm:h-40 w-full transition-all duration-1000">
          {displayData.map((val, idx) => (
            <div 
              key={idx}
              className={`flex-1 w-full bg-gradient-to-t from-indigo-900 to-indigo-400 rounded-t-[1px] ${getAnimation(idx)}`}
              style={{ 
                height: `${Math.max(5, val)}%`,
                animationDelay: `${idx * 15}ms` 
              }} 
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface ProFeatures {
  key: string;
  guide: string;
  playlist: { title: string; artist: string }[];
}

/**
 * [업데이트] PRO 플랜 전용 보컬 성장 솔루션 컴포넌트 (동적 데이터 바인딩)
 */
function VocalGrowthCenter({ isPro, proFeatures }: { isPro: boolean, proFeatures?: ProFeatures }) {
  // 백엔드 데이터가 없을 경우를 대비한 폴백 데이터
  const fallbackData = {
    key: "분석 중...",
    guide: "보컬 트레이닝 피드백을 생성 중입니다.",
    playlist: [
      { title: "추천곡을 불러오는 중", artist: "-" },
      { title: "추천곡을 불러오는 중", artist: "-" },
      { title: "추천곡을 불러오는 중", artist: "-" }
    ]
  };

  const data = proFeatures || fallbackData;

  return (
    <div className="relative mt-12 rounded-[var(--mvp-radius-lg)] bg-[#050505] border border-white/5 overflow-hidden">
      {/* Header */}
      <div className="p-8 pb-6 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-black text-white flex items-center gap-2 mb-1 tracking-tight">
            <Target className="w-5 h-5 text-indigo-400" />
            Vocal Action Plan
          </h3>
          <p className="text-sm text-white/40 font-medium">단순한 분석을 넘어, 당신의 목소리를 성장시킬 맞춤형 솔루션</p>
        </div>
        {!isPro ? (
          <span className="px-4 py-1.5 bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white text-[10px] font-black rounded-full shadow-lg shadow-fuchsia-500/20 uppercase tracking-widest self-start animate-pulse">
            PRO ONLY
          </span>
        ) : (
          <span className="px-4 py-1.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-black rounded-full border border-emerald-500/20 uppercase tracking-widest self-start">
            UNLOCKED
          </span>
        )}
      </div>

      {/* Content Area */}
      <div className={`p-8 grid md:grid-cols-2 gap-8 transition-all duration-1000 ${!isPro ? 'blur-xl opacity-20 select-none pointer-events-none' : ''}`}>
        
        {/* Left: Actionable Feedback */}
        <div className="space-y-8">
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Mic2 className="w-4 h-4 text-emerald-400" />
              <h4 className="font-bold text-white/80 text-sm">최적의 키(Key) 추천</h4>
            </div>
            <div className="text-3xl font-black text-white tracking-tighter mb-2">{data.key}</div>
            <p className="text-xs text-white/40">원곡보다 키를 조정하여 부르면 가장 매력적인 톤이 나옵니다.</p>
          </div>

          <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 blur-2xl rounded-full" />
            <div className="flex items-center gap-2 mb-4 relative z-10">
              <Stethoscope className="w-4 h-4 text-indigo-400" />
              <h4 className="font-bold text-indigo-300 text-sm">1:1 보컬 트레이닝 피드백</h4>
            </div>
            <p className="text-sm text-white/80 leading-relaxed font-medium relative z-10 break-keep">
              {data.guide}
            </p>
          </div>
        </div>

        {/* Right: Curated Playlist */}
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <ListMusic className="w-4 h-4 text-fuchsia-400" />
              <h4 className="font-bold text-white/80 text-sm">찰떡 매칭 3곡 플레이리스트</h4>
            </div>
          </div>
          <div className="space-y-3 flex-1">
            {data.playlist.map((song, i) => (
              <div 
                key={i} 
                className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group"
              >
                <div className="flex items-center gap-4 cursor-pointer" onClick={() => window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(song.artist + ' ' + song.title)}`, '_blank')} title="유튜브에서 원곡 듣기">
                  <span className="text-lg font-black text-white/20 group-hover:text-fuchsia-400 transition-colors">0{i+1}</span>
                  <div>
                    <p className="font-bold text-white text-sm">{song.title}</p>
                    <p className="text-xs text-white/40">{song.artist}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => alert("STUDIO 플랜 기능입니다: 실제 서비스에서는 이 곡에 사용자의 목소리를 합성한 15초 AI 커버 MP3를 재생합니다.")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-fuchsia-600/20 to-purple-600/20 text-fuchsia-300 hover:from-fuchsia-500 hover:to-purple-500 hover:text-white transition-all text-xs font-bold border border-fuchsia-500/30"
                    title="AI로 내 목소리 커버 생성하기 (STUDIO 전용)"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    AI 커버
                  </button>
                  <PlayCircle 
                    className="w-8 h-8 text-white/20 hover:text-white transition-colors cursor-pointer" 
                    onClick={() => window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(song.artist + ' ' + song.title)}`, '_blank')}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pro Paywall (Value-Driven) */}
      {!isPro && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 backdrop-blur-md">
          <div className="flex flex-col items-center w-full max-w-lg text-center p-8 bg-[#0a0a0a] rounded-3xl border border-white/10 shadow-2xl">
             <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 via-purple-500 to-fuchsia-500 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(168,85,247,0.4)] rotate-3">
               <Crown className="w-8 h-8 text-white -rotate-3" />
             </div>
             <h4 className="text-3xl font-black text-white mb-2 tracking-tight">당신의 보컬 잠재력을 깨우세요</h4>
             <p className="text-sm text-white/60 mb-8 font-medium">단순한 재미를 넘어, 진짜 노래를 잘 부르고 싶다면.</p>
             
             <div className="w-full space-y-3 mb-8 text-left">
               <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                 <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                 <span className="text-sm font-bold text-white/90">내 성대에 가장 편안한 맞춤 Key 제공</span>
               </div>
               <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                 <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                 <span className="text-sm font-bold text-white/90">약점을 보완하는 1:1 발성 훈련 가이드</span>
               </div>
               <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                 <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                 <span className="text-sm font-bold text-white/90">내 목소리에 딱 맞는 찰떡 선곡 리스트</span>
               </div>
             </div>

             <MvpButton variant="primary" className="w-full !py-4 !rounded-xl bg-white text-black hover:bg-gray-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] text-base">
               지금 바로 솔루션 확인하기
             </MvpButton>
             <p className="text-[10px] text-white/30 mt-4 uppercase tracking-widest font-bold">Cancel Anytime</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MvpAudioUploader() {
  const searchParams = useSearchParams();
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // URL에 taskId가 있을 경우 자동으로 해당 결과 로드
  useEffect(() => {
    const taskId = searchParams.get('taskId');
    if (taskId) {
      pollStatus(taskId);
    }
  }, [searchParams]);

  const pollStatus = async (taskId: string) => {
    if (!taskId || taskId === 'undefined') {
      setUploadState('error');
      setErrorMessage('유효하지 않은 작업 ID입니다.');
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/v1/analyze/${taskId}/status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('상태 조회 중 서버 오류가 발생했습니다.');
      
      const data = await res.json();
      if (data.status === 'COMPLETED') {
        setMatchResult({
          title: data.matchedSongTitle || data.title || '제목 없음',
          artist: data.matchedArtist || data.artist || '아티스트 미상',
          albumCoverUrl: data.albumCoverUrl || data.album_cover_url,
          previewUrl: data.previewUrl || data.preview_url,
          voiceTags: data.voiceTags || [],
          similarityScore: data.similarityScore ?? 0,
          pitchHz: data.pitchHz ?? 0,
          recommendReason: data.recommendReason || '',
          vocalPersona: data.vocalPersona || '',
          vocalStats: data.vocalStats || null,
          userPlan: data.userPlan || 'FREE', 
          proFeatures: data.proFeatures || undefined,
        });
        setUploadState('success');
      } else if (data.status === 'FAILED') {
        throw new Error('분석에 실패했습니다.');
      } else {
        setTimeout(() => pollStatus(taskId), 3000);
      }
    } catch (err) {
      setUploadState('error');
      setErrorMessage('오류가 발생했습니다.');
    }
  };

  const processFile = async (file: File) => {
    setUploadState('uploading');
    try {
      const token = localStorage.getItem('accessToken');
      const form = new FormData();
      form.append('file', file);
      
      const res = await fetch('/api/v1/analyze', { 
        method: 'POST', 
        body: form,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || '서버 업로드에 실패했습니다.');
      }
      
      const { taskId } = await res.json();
      if (!taskId) throw new Error('분석 작업 ID를 받지 못했습니다.');
      
      pollStatus(taskId);
    } catch (err: any) {
      setUploadState('error');
      setErrorMessage(err.message || '업로드 중 오류가 발생했습니다.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const getPitchPos = (hz: number) => Math.min(100, Math.max(0, ((hz - 80) / 320) * 100));

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="mvp-glass-card overflow-hidden flex flex-col min-h-[550px] border-white/10">
        
        {/* Tool Header */}
        <div className="p-6 sm:p-8 border-b border-white/5 flex items-center justify-between bg-[#0a0a0a]/50">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
               {uploadState === 'success' ? <CheckCircle2 className="w-5 h-5 text-indigo-400" /> : <Activity className="w-5 h-5 text-indigo-400" />}
             </div>
             <div>
               <h3 className="mvp-title text-lg sm:text-xl">{uploadState === 'success' ? 'Analysis Result' : 'Vocal Intelligence'}</h3>
               <p className="text-xs sm:text-sm text-[var(--mvp-text-muted)] font-medium">인공지능 음향 데이터 분석 엔진 v2.0</p>
             </div>
          </div>
          {uploadState === 'success' && (
            <MvpButton variant="outline" size="md" onClick={() => setUploadState('idle')} className="!py-2 !px-4 text-xs sm:text-sm">
              <RotateCcw className="w-4 h-4 mr-2" /> New
            </MvpButton>
          )}
        </div>

        {/* Tool Body */}
        <div className="flex-1 p-6 sm:p-8">
          {uploadState === 'success' && matchResult ? (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out space-y-8">
              
              {/* HERO SECTION: Artist & Persona */}
              <div className="relative overflow-hidden rounded-[var(--mvp-radius-lg)] border border-white/10 bg-[#0a0a0a] group">
                {/* Dynamic Background */}
                <div className="absolute inset-0 z-0 opacity-30 transition-opacity duration-1000 group-hover:opacity-40">
                  <img src={matchResult.albumCoverUrl} className="w-full h-full object-cover blur-3xl scale-125" alt="blur-bg" />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent" />
                </div>

                <div className="relative z-10 p-8 sm:p-12 flex flex-col md:flex-row gap-8 md:gap-12 items-center md:items-stretch">
                  {/* Album Cover */}
                  <div className="relative w-48 h-48 md:w-56 md:h-56 shrink-0 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10">
                    <img src={matchResult.albumCoverUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={matchResult.artist} />
                    <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-1.5 shadow-xl">
                       <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                       <span className="text-[10px] font-black text-white tracking-widest">{matchResult.similarityScore}% MATCH</span>
                    </div>
                  </div>
                  
                  {/* Persona Info */}
                  <div className="flex flex-col justify-center flex-1 text-center md:text-left">
                    <span className="text-[10px] font-black tracking-[0.3em] text-indigo-400 uppercase mb-3 block">Acoustic Persona Profiling</span>
                    <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black mvp-display leading-tight mb-4 text-white tracking-tighter">
                      &ldquo;{matchResult.vocalPersona}&rdquo;
                    </h2>
                    <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-6">
                      {matchResult.voiceTags?.map((tag, i) => (
                         <span key={i} className="text-[10px] font-bold px-3 py-1.5 bg-white/10 border border-white/5 rounded-full text-white/80">{tag}</span>
                      ))}
                    </div>
                    <p className="text-sm md:text-base text-white/60 leading-relaxed font-medium max-w-2xl break-keep">
                      {matchResult.recommendReason}
                    </p>
                  </div>
                </div>
              </div>

              {/* TWO COLUMNS: Stats & Track */}
              <div className="grid lg:grid-cols-12 gap-8">
                
                {/* Stats Panel (col-span-8) */}
                <div className="lg:col-span-8 bg-white/[0.02] border border-white/5 rounded-[var(--mvp-radius-lg)] p-8">
                   <h3 className="text-xs font-black tracking-widest uppercase text-white/50 mb-8 flex items-center gap-2">
                     <Activity className="w-4 h-4 text-indigo-400"/>
                     Vocal Attributes
                   </h3>
                   
                   {matchResult.vocalStats && (
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-8">
                       <StatBar label="Warmth" value={matchResult.vocalStats.warmth} icon={<Flame className="w-4 h-4 text-orange-400" />} color="bg-orange-400" />
                       <StatBar label="Clarity" value={matchResult.vocalStats.clarity} icon={<Wind className="w-4 h-4 text-sky-400" />} color="bg-sky-400" />
                       <StatBar label="Power" value={matchResult.vocalStats.power} icon={<Zap className="w-4 h-4 text-amber-400" />} color="bg-amber-400" />
                       <StatBar label="Rhythm" value={matchResult.vocalStats.rhythm} icon={<Activity className="w-4 h-4 text-emerald-400" />} color="bg-emerald-400" />
                       <StatBar label="Emotion" value={matchResult.vocalStats.emotion} icon={<Heart className="w-4 h-4 text-rose-400" />} color="bg-rose-400" />
                       
                       <div className="space-y-3">
                         <div className="flex items-center justify-between text-sm">
                           <div className="flex items-center gap-2 text-[var(--mvp-text-muted)]">
                             <Mic2 className="w-4 h-4 text-indigo-400" />
                             <span className="font-medium">Vocal Pitch</span>
                           </div>
                           <span className="font-bold text-white">{matchResult.pitchHz} <span className="text-[10px] text-white/50 font-normal">Hz</span></span>
                         </div>
                         <div className="relative w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                           <div className="absolute top-0 left-0 h-full bg-indigo-500/20 w-full" />
                           <div className="absolute top-0 h-full bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" style={{ width: `${getPitchPos(matchResult.pitchHz || 0)}%` }} />
                         </div>
                       </div>
                     </div>
                   )}
                </div>

                {/* Track Panel (col-span-4) */}
                <div className="lg:col-span-4 flex flex-col h-full">
                  <div className="bg-gradient-to-br from-indigo-500/10 to-transparent border border-indigo-500/20 rounded-[var(--mvp-radius-lg)] p-8 relative overflow-hidden flex flex-col h-full justify-between group hover:border-indigo-500/40 transition-colors">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full translate-x-10 -translate-y-10" />
                     
                     <div>
                       <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-4 flex items-center gap-2">
                         <Music className="w-3 h-3" /> Recommended Track
                       </span>
                       <h4 className="text-2xl font-black text-white mb-1 leading-tight">{matchResult.title}</h4>
                       <p className="text-sm text-white/50 font-bold mb-8">{matchResult.artist}</p>
                     </div>
                     
                     <button 
                       onClick={() => matchResult.previewUrl && window.open(matchResult.previewUrl, '_blank')}
                       className="w-full py-4 bg-white hover:bg-gray-100 text-black rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-[0_10px_20px_rgba(255,255,255,0.1)] active:scale-95"
                     >
                       <Play className="w-4 h-4 fill-current" /> Play Preview
                     </button>
                  </div>
                </div>
              </div>

              {/* FULL WIDTH DNA CHART (무료 개방) */}
              {matchResult.vocalStats && (
                <VocalDnaChart 
                  data={matchResult.vocalStats.dna_128_points || []} 
                />
              )}

              {/* ACTIONABLE GROWTH CENTER (새로운 페이월) */}
              <VocalGrowthCenter 
                isPro={matchResult.userPlan === 'PRO' || matchResult.userPlan === 'STUDIO'} 
                proFeatures={matchResult.proFeatures}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="audio/mpeg,audio/wav,audio/x-m4a,audio/mp4,audio/aac"
                onChange={handleFileChange} 
              />
              <div
                className={`
                  w-full max-w-3xl min-h-[450px] rounded-[var(--mvp-radius-lg)] border border-dashed
                  flex flex-col items-center justify-center p-12 transition-all duration-700 cursor-pointer group
                  ${uploadState === 'dragging' ? 'border-indigo-500 bg-indigo-500/10 scale-[1.02]'
                    : uploadState === 'uploading' ? 'border-white/10 bg-white/[0.02] cursor-default'
                      : uploadState === 'error' ? 'border-red-500/30 bg-red-500/5'
                        : 'border-white/10 bg-[#050505] hover:border-white/30 hover:bg-white/[0.02] shadow-2xl'}
                `}
                onDragOver={(e) => { e.preventDefault(); setUploadState('dragging'); }}
                onDragLeave={() => setUploadState('idle')}
                onDrop={(e) => {
                   e.preventDefault();
                   const file = e.dataTransfer.files[0];
                   if (file) processFile(file);
                }}
                onClick={() => { if (uploadState === 'idle' || uploadState === 'error') fileInputRef.current?.click(); }}
              >
                {uploadState === 'uploading' ? (
                  <div className="flex flex-col items-center gap-10">
                    <div className="relative">
                       <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full animate-pulse" />
                       <Loader2 className="w-20 h-20 animate-spin text-indigo-500 relative z-10" />
                    </div>
                    <div className="text-center space-y-3">
                       <h3 className="text-3xl font-black tracking-tight text-white">Extracting DNA...</h3>
                       <p className="text-lg text-[var(--mvp-text-muted)] font-medium">당신의 목소리에서 128개의 음악적 지점을 분석하고 있습니다.</p>
                    </div>
                  </div>
                ) : uploadState === 'error' ? (
                  <div className="flex flex-col items-center gap-6 text-center animate-in zoom-in-95 duration-500">
                    <div className="w-24 h-24 bg-red-500/10 rounded-3xl flex items-center justify-center border border-red-500/20">
                      <AlertCircle className="w-12 h-12 text-red-500" />
                    </div>
                    <div className="space-y-2">
                       <h3 className="text-3xl font-black text-red-500 tracking-tight">Analysis Failed</h3>
                       <p className="text-lg text-[var(--mvp-text-muted)] max-w-sm font-medium">{errorMessage}</p>
                    </div>
                    <MvpButton variant="outline" size="md" onClick={(e) => { e.stopPropagation(); setUploadState('idle'); }} className="mt-6 !px-8">
                      Try Again
                    </MvpButton>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-10 text-center">
                    <div className="relative">
                      <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full group-hover:scale-150 transition-transform duration-1000" />
                      <div className="w-32 h-32 bg-gradient-to-tr from-[#111] to-[#1a1a1a] rounded-[var(--mvp-radius-lg)] flex items-center justify-center border border-white/10 shadow-2xl relative z-10 group-hover:-translate-y-2 transition-transform duration-500">
                        <UploadCloud className="w-16 h-16 text-indigo-400" />
                      </div>
                    </div>
                    <div className="space-y-4">
                       <h3 className="text-4xl font-black tracking-tighter text-white">Your Sound, Our Data.</h3>
                       <p className="text-lg text-[var(--mvp-text-muted)] max-w-sm font-medium break-keep">MP3, WAV 파일을 드롭하거나 클릭하여 당신의 고유한 보컬 DNA를 발견하세요.</p>
                    </div>
                    <MvpButton variant="primary" size="lg" className="!px-10 shadow-[0_15px_30px_rgba(99,102,241,0.3)] !rounded-full">Choose Audio File</MvpButton>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

