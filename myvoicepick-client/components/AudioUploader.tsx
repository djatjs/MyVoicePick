'use client';

import React, { useState, useRef } from 'react';
import {
  UploadCloud, Loader2, AlertCircle, CheckCircle2,
  Music, Mic2, Sparkles, RotateCcw, Flame, Zap, Wind, Heart, Activity, Play
} from 'lucide-react';

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

// 스탯 바 한 줄 컴포넌트 (완전한 다크모드)
function StatBar({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-zinc-400">
          {icon}
          <span className="font-medium text-zinc-300">{label}</span>
        </div>
        <span className="font-bold text-zinc-100">{value}</span>
      </div>
      <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden border border-zinc-800/50">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export default function AudioUploader() {
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const SUPPORTED_FORMATS = ['audio/mpeg', 'audio/wav', 'audio/x-m4a', 'audio/mp4', 'audio/aac'];
  const SUPPORTED_EXTENSIONS = ['.mp3', '.wav', '.m4a'];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (uploadState === 'uploading') return;
    setUploadState('dragging');
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (uploadState === 'uploading') return;
    setUploadState('idle');
  };

  const validateFile = (file: File): string | null => {
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!SUPPORTED_FORMATS.includes(file.type) && !SUPPORTED_EXTENSIONS.includes(ext))
      return '지원하지 않는 파일 형식입니다. (.mp3, .m4a, .wav만 가능)';
    if (file.size > 50 * 1024 * 1024)
      return '파일 크기는 50MB를 초과할 수 없습니다.';
    return null;
  };

  const pollStatus = async (taskId: string) => {
    try {
      const res = await fetch(`/api/v1/analyze/${taskId}/status`);
      if (!res.ok) throw new Error(`상태 조회 실패 (${res.status})`);
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
        throw new Error('분석에 실패했습니다. 다시 시도해 주세요.');
      } else {
        setTimeout(() => pollStatus(taskId), 3000);
      }
    } catch (err: unknown) {
      setUploadState('error');
      setErrorMessage(err instanceof Error ? err.message : '오류가 발생했습니다.');
      setTimeout(() => setUploadState('idle'), 3000);
    }
  };

  const processFile = async (file: File) => {
    const err = validateFile(file);
    if (err) {
      setErrorMessage(err); setUploadState('error');
      setTimeout(() => { setUploadState('idle'); setErrorMessage(''); }, 3000);
      return;
    }
    setUploadState('uploading'); setErrorMessage(''); setMatchResult(null);
    try {
      const form = new FormData();
      form.append('userId', '1'); form.append('file', file);
      const res = await fetch('/api/v1/analyze', { method: 'POST', body: form });
      if (!res.ok) throw new Error(`서버 전송 실패 (${res.status})`);
      const { taskId } = await res.json();
      if (!taskId) throw new Error('taskId를 받지 못했습니다.');
      pollStatus(taskId);
    } catch (err: unknown) {
      setUploadState('error');
      setErrorMessage(err instanceof Error ? err.message : '업로드 중 오류가 발생했습니다.');
      setTimeout(() => setUploadState('idle'), 3000);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (uploadState === 'uploading') return;
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setUploadState('idle'); setMatchResult(null);
  };

  const getPitchPos = (hz: number) => Math.min(100, Math.max(0, ((hz - 80) / 320) * 100));

  return (
    <div className="w-full max-w-4xl mx-auto mt-8 sm:mt-12 px-4">
      {/* 
        메인 컨테이너: 강제 다크 모드 (bg-zinc-950)
      */}
      <div className="group relative overflow-hidden w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-2xl transition-all duration-300 shadow-[0_8px_30px_rgb(0,0,0,0.4)] flex flex-col min-h-[500px]">

        {/* ==================== 헤더 영역 ==================== */}
        <div className="p-4 sm:p-5 flex items-center justify-between border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              {uploadState === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <Mic2 className="w-5 h-5 text-emerald-400" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">
                {uploadState === 'success' ? 'Vocal DNA Analysis Complete' : 'AI Vocal Analyzer'}
              </h3>
              <p className="text-xs text-zinc-400">
                {uploadState === 'success'
                  ? '당신의 목소리와 완벽하게 어울리는 곡을 찾았습니다.'
                  : '목소리를 업로드하고 인생곡을 찾아보세요.'}
              </p>
            </div>
          </div>

          {uploadState === 'success' && (
            <button
              onClick={handleReset}
              className="p-2 rounded-lg hover:bg-zinc-800 transition-colors flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 font-medium"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">다시 분석하기</span>
            </button>
          )}
        </div>

        {/* ==================== 바디 영역 ==================== */}
        <div className="flex-1 p-4 sm:p-6 flex flex-col justify-center bg-zinc-950">

          {/* 성공 화면 (결과 대시보드) */}
          {uploadState === 'success' && matchResult ? (
            <div className="flex flex-col md:flex-row gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

              {/* 좌측 패널: 앨범 커버 & 매칭 곡 정보 */}
              <div className="w-full md:w-5/12 flex flex-col gap-4">
                <div className="relative w-full aspect-square rounded-xl overflow-hidden border border-zinc-800 shadow-inner group-hover:shadow-lg transition-all bg-zinc-900">
                  {matchResult.albumCoverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={matchResult.albumCoverUrl}
                      alt="앨범 커버"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                      <Music className="w-16 h-16 text-zinc-700" />
                    </div>
                  )}

                  {/* 유사도 뱃지 */}
                  <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-full border border-emerald-500/30">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-bold text-xs">매칭률 {matchResult.similarityScore}%</span>
                  </div>
                </div>

                {/* 곡 정보 카드 */}
                <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Best Match Song</p>
                  <div>
                    <h4 className="text-lg font-bold text-zinc-100 truncate">{matchResult.title}</h4>
                    <p className="text-sm text-emerald-400 font-medium">{matchResult.artist}</p>
                  </div>
                  {matchResult.previewUrl && (
                    <button
                      onClick={() => window.open(matchResult.previewUrl, '_blank')}
                      className="mt-3 w-full h-10 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 text-sm font-bold rounded-lg transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] active:scale-[0.98]"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      미리듣기
                    </button>
                  )}
                </div>
              </div>

              {/* 우측 패널: 분석 리포트 */}
              <div className="w-full md:w-7/12 flex flex-col gap-4">

                {/* 페르소나 타이틀 */}
                <div className="space-y-3 pb-2">
                  <h2 className="text-2xl font-black text-zinc-100 leading-tight">
                    &ldquo;{matchResult.vocalPersona || '매력적인 음색의 소유자'}&rdquo;
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {matchResult.voiceTags?.map((tag, i) => (
                      <span key={i} className="text-xs font-semibold px-2.5 py-1 bg-zinc-800 text-zinc-300 rounded-md border border-zinc-700">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 추천 사유 */}
                <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-900/30">
                  <p className="text-sm text-zinc-300 leading-relaxed italic">
                    &ldquo;{matchResult.recommendReason}&rdquo;
                  </p>
                </div>

                {/* 보컬 스탯 (Grid 적용) */}
                {matchResult.vocalStats && (
                  <div className="p-5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="w-4 h-4 text-zinc-500" />
                      <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Vocal Characteristics</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                      <StatBar label="Warmth" value={matchResult.vocalStats.warmth} icon={<Flame className="w-3.5 h-3.5" />} color="bg-orange-500" />
                      <StatBar label="Clarity" value={matchResult.vocalStats.clarity} icon={<Wind className="w-3.5 h-3.5" />} color="bg-sky-500" />
                      <StatBar label="Power" value={matchResult.vocalStats.power} icon={<Zap className="w-3.5 h-3.5" />} color="bg-violet-500" />
                      <StatBar label="Rhythm" value={matchResult.vocalStats.rhythm} icon={<Activity className="w-3.5 h-3.5" />} color="bg-emerald-500" />
                      <StatBar label="Emotion" value={matchResult.vocalStats.emotion} icon={<Heart className="w-3.5 h-3.5" />} color="bg-rose-500" />

                      {/* 음역대(Pitch) 게이지 */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 text-zinc-400">
                            <Mic2 className="w-3.5 h-3.5" />
                            <span className="font-medium text-zinc-300">Pitch (Hz)</span>
                          </div>
                          <span className="font-bold text-emerald-400">{matchResult.pitchHz}</span>
                        </div>
                        <div className="relative w-full h-2 bg-zinc-800 rounded-full mt-1 border border-zinc-800/50">
                          <div
                            className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-blue-500 via-emerald-400 to-amber-400"
                            style={{ width: `${getPitchPos(matchResult.pitchHz || 0)}%` }}
                          />
                          <div
                            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-zinc-100 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                            style={{ left: `calc(${getPitchPos(matchResult.pitchHz || 0)}% - 6px)` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (

            /* 기본 업로드 드롭존 (강제 다크모드) */
            <div className="w-full flex items-center justify-center">
              <input
                type="file" ref={fileInputRef} className="hidden"
                accept=".mp3,.m4a,.wav,audio/mpeg,audio/wav,audio/mp4,audio/aac,audio/x-m4a"
                onChange={handleFileChange}
                disabled={uploadState === 'uploading'}
              />
              <div
                className={`
                  relative flex flex-col items-center justify-center
                  w-full max-w-xl min-h-[300px] rounded-xl border-2 border-dashed
                  transition-all duration-300 cursor-pointer overflow-hidden p-8
                  ${uploadState === 'dragging' ? 'border-emerald-500 bg-emerald-500/10 scale-[1.02]'
                    : uploadState === 'error' ? 'border-red-900/50 bg-red-950/20 cursor-default'
                      : uploadState === 'uploading' ? 'border-zinc-800 bg-zinc-900/50 cursor-default'
                        : 'border-zinc-700 bg-zinc-900/30 hover:border-zinc-500 hover:bg-zinc-800/50'}
                `}
                onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                onClick={() => { if (uploadState === 'idle' || uploadState === 'dragging') fileInputRef.current?.click(); }}
              >
                {uploadState === 'uploading' ? (
                  <div className="flex flex-col items-center space-y-6 animate-in fade-in duration-500">
                    <div className="relative w-16 h-16">
                      <Loader2 className="w-full h-full animate-spin text-emerald-400" />
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-transparent to-emerald-500/20 rounded-full animate-spin-slow" />
                    </div>
                    <div className="text-center space-y-1.5">
                      <p className="text-sm font-medium text-zinc-100">AI가 목소리를 분석하고 있습니다...</p>
                      <p className="text-xs text-zinc-400">음역대, 음색, 보컬 특성을 추출하는 중입니다 (약 10~15초 소요)</p>
                    </div>
                    {/* 로딩 프로그레스 바 */}
                    <div className="w-48 h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-4">
                      <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 w-full origin-left animate-pulse" />
                    </div>
                  </div>
                ) : uploadState === 'error' ? (
                  <div className="flex flex-col items-center space-y-3">
                    <AlertCircle className="w-12 h-12 text-red-500" />
                    <p className="text-red-400 font-medium text-center text-sm">{errorMessage}</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-4 pointer-events-none text-center">
                    <div className="p-4 bg-zinc-900 rounded-full shadow-sm border border-zinc-800">
                      <UploadCloud className="w-8 h-8 text-zinc-400" strokeWidth={1.5} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-base font-semibold text-zinc-100">
                        클릭하거나 파일을 이곳에 드롭하세요
                      </p>
                      <p className="text-sm text-zinc-400">
                        MP3, WAV, M4A 지원 (최대 50MB)
                      </p>
                    </div>
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