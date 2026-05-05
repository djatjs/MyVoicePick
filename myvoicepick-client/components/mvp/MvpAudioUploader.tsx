'use client';

import React, { useState, useRef } from 'react';
import {
  UploadCloud, Loader2, AlertCircle, CheckCircle2,
  Music, Mic2, Sparkles, RotateCcw, Flame, Zap, Wind, Heart, Activity, Play
} from 'lucide-react';
import { MvpButton } from './MvpButton';

type UploadState = 'idle' | 'dragging' | 'uploading' | 'success' | 'error';

interface VocalStats {
  warmth: number;
  clarity: number;
  power: number;
  rhythm: number;
  emotion: number;
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

export default function MvpAudioUploader() {
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pollStatus = async (taskId: string) => {
    if (!taskId || taskId === 'undefined') {
      setUploadState('error');
      setErrorMessage('유효하지 않은 작업 ID입니다.');
      return;
    }

    try {
      const res = await fetch(`/api/v1/analyze/${taskId}/status`);
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
      const form = new FormData();
      form.append('userId', '1'); form.append('file', file);
      
      const res = await fetch('/api/v1/analyze', { method: 'POST', body: form });
      
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
      <div className="mvp-glass-card overflow-hidden flex flex-col min-h-[550px]">
        
        {/* Tool Header */}
        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
               {uploadState === 'success' ? <CheckCircle2 className="text-indigo-400" /> : <Activity className="text-indigo-400" />}
             </div>
             <div>
               <h3 className="mvp-title text-xl">{uploadState === 'success' ? 'Analysis Complete' : 'Vocal Intelligence'}</h3>
               <p className="text-sm text-[var(--mvp-text-muted)] font-medium">실시간 AI 보컬 프로파일링 엔진</p>
             </div>
          </div>
          {uploadState === 'success' && (
            <MvpButton variant="outline" size="md" onClick={() => setUploadState('idle')} className="!py-2 !px-4">
              <RotateCcw className="w-4 h-4 mr-2" /> Reset
            </MvpButton>
          )}
        </div>

        {/* Tool Body */}
        <div className="flex-1 p-8 sm:p-12">
          {uploadState === 'success' && matchResult ? (
            <div className="grid lg:grid-cols-2 gap-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
              
              {/* Left Panel: The Artist Image & Card */}
              <div className="space-y-6">
                <div className="relative group aspect-[4/3] rounded-[var(--mvp-radius-lg)] overflow-hidden shadow-2xl">
                  {matchResult.albumCoverUrl ? (
                    <img src={matchResult.albumCoverUrl} alt="Artist" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                  ) : (
                    <div className="w-full h-full bg-[var(--mvp-surface-light)] flex items-center justify-center">
                      <Music className="w-20 h-20 opacity-20" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--mvp-bg)] to-transparent opacity-60"></div>
                  <div className="absolute bottom-6 left-6">
                    <span className="text-xs font-bold text-white/60 uppercase tracking-[0.2em] mb-1 block">Best Match Artist</span>
                    <h4 className="text-4xl font-black mvp-display">{matchResult.artist}</h4>
                  </div>
                  <div className="absolute top-6 right-6">
                    <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
                       <Sparkles className="w-4 h-4 text-amber-400" />
                       <span className="text-sm font-bold">{matchResult.similarityScore}% Match</span>
                    </div>
                  </div>
                </div>

                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-[var(--mvp-radius-md)] p-6">
                   <h5 className="text-sm font-bold text-indigo-300 mb-2">Recommended Track</h5>
                   <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xl font-bold">{matchResult.title}</p>
                      </div>
                      <div 
                        onClick={() => matchResult.previewUrl && window.open(matchResult.previewUrl, '_blank')}
                        className="w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.5)] cursor-pointer hover:scale-110 transition-transform text-white"
                      >
                         <Play className="fill-current ml-1 w-5 h-5" />
                      </div>
                   </div>
                </div>
              </div>

              {/* Right Panel: Analysis Report */}
              <div className="space-y-8">
                <div>
                  <span className="mvp-gradient-text font-black text-sm uppercase tracking-widest block mb-2">Vocal Persona</span>
                  <h2 className="text-5xl mvp-display leading-none mb-4">
                    &ldquo;{matchResult.vocalPersona || 'Modern Soul'}&rdquo;
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {matchResult.voiceTags?.map((tag, i) => (
                      <span key={i} className="text-[10px] font-bold px-3 py-1 bg-white/5 rounded-full border border-white/10 text-white/70 uppercase tracking-widest">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <p className="text-lg text-[var(--mvp-text-muted)] italic leading-relaxed border-l-4 border-[var(--mvp-primary)] pl-6">
                  &ldquo;{matchResult.recommendReason}&rdquo;
                </p>

                {matchResult.vocalStats && (
                  <div className="space-y-6 pt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6">
                      <StatBar label="Warmth" value={matchResult.vocalStats.warmth} icon={<Flame className="w-4 h-4 text-orange-400" />} color="bg-orange-400 text-orange-400" />
                      <StatBar label="Clarity" value={matchResult.vocalStats.clarity} icon={<Wind className="w-4 h-4 text-sky-400" />} color="bg-sky-400 text-sky-400" />
                      <StatBar label="Power" value={matchResult.vocalStats.power} icon={<Zap className="w-4 h-4 text-amber-400" />} color="bg-amber-400 text-amber-400" />
                      <StatBar label="Rhythm" value={matchResult.vocalStats.rhythm} icon={<Activity className="w-4 h-4 text-emerald-400" />} color="bg-emerald-400 text-emerald-400" />
                      <StatBar label="Emotion" value={matchResult.vocalStats.emotion} icon={<Heart className="w-4 h-4 text-rose-400" />} color="bg-rose-400 text-rose-400" />
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 text-[var(--mvp-text-muted)]">
                            <Mic2 className="w-4 h-4 text-indigo-400" />
                            <span className="font-medium">Pitch (Hz)</span>
                          </div>
                          <span className="font-bold text-indigo-400">{matchResult.pitchHz}</span>
                        </div>
                        <div className="relative w-full h-1.5 bg-white/5 rounded-full">
                          <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full" style={{ width: `${getPitchPos(matchResult.pitchHz || 0)}%` }} />
                          <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-[0_0_10px_#fff]" style={{ left: `calc(${getPitchPos(matchResult.pitchHz || 0)}% - 6px)` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
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
                  w-full max-w-3xl min-h-[400px] rounded-[var(--mvp-radius-lg)] border-2 border-dashed
                  flex flex-col items-center justify-center p-12 transition-all duration-500 cursor-pointer
                  ${uploadState === 'dragging' ? 'border-[var(--mvp-primary)] bg-[var(--mvp-primary)]/5 scale-[1.02]'
                    : uploadState === 'uploading' ? 'border-white/10 bg-white/[0.02] cursor-default'
                      : uploadState === 'error' ? 'border-red-500/20 bg-red-500/5'
                        : 'border-white/10 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.05]'}
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
                  <div className="flex flex-col items-center gap-8 animate-pulse">
                    <Loader2 className="w-16 h-16 animate-spin text-[var(--mvp-primary)]" />
                    <div className="text-center space-y-2">
                       <p className="text-2xl font-bold text-white">DNA 분석 중...</p>
                       <p className="text-[var(--mvp-text-muted)]">당신의 목소리에서 음악적 지문을 추출하고 있습니다.</p>
                    </div>
                  </div>
                ) : uploadState === 'error' ? (
                  <div className="flex flex-col items-center gap-6 text-center animate-in zoom-in-95 duration-300">
                    <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
                      <AlertCircle className="w-10 h-10 text-red-500" />
                    </div>
                    <div className="space-y-2">
                       <h3 className="text-2xl font-bold text-red-500">Analysis Failed</h3>
                       <p className="text-[var(--mvp-text-muted)] max-w-sm">{errorMessage}</p>
                    </div>
                    <MvpButton variant="outline" size="md" onClick={(e) => { e.stopPropagation(); setUploadState('idle'); }} className="mt-4">
                      Try Again
                    </MvpButton>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-8 text-center">
                    <div className="w-24 h-24 bg-gradient-to-tr from-indigo-500/20 to-violet-500/20 rounded-3xl flex items-center justify-center border border-white/10 shadow-inner">
                      <UploadCloud className="w-12 h-12 text-indigo-400" />
                    </div>
                    <div className="space-y-4">
                       <h3 className="text-3xl font-bold">Upload Your Sound</h3>
                       <p className="text-[var(--mvp-text-muted)] max-w-sm">MP3, WAV 파일을 드롭하거나 클릭하여 분석을 시작하세요. (최대 50MB)</p>
                    </div>
                    <MvpButton variant="primary" size="lg">Choose Audio File</MvpButton>
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
