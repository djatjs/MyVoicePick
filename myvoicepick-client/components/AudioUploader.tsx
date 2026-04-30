'use client';

import React, { useState, useRef } from 'react';
import {
  UploadCloud, Loader2, AlertCircle, CheckCircle2,
  Music, Mic2, Sparkles, RotateCcw, Flame, Zap, Wind, Heart, Activity
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

// 스탯 바 한 줄 컴포넌트 (외부 라이브러리 없이 Tailwind만 사용)
function StatBar({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center space-x-1.5 text-zinc-400 font-bold">
          {icon}
          <span>{label}</span>
        </div>
        <span className="font-black text-white">{value}</span>
      </div>
      <div className="w-full h-1.5 bg-zinc-700/60 rounded-full overflow-hidden">
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

  const getPitchPos = (hz: number) =>
    Math.min(100, Math.max(0, ((hz - 80) / 320) * 100));

  // ==================== 성공 결과 대시보드 ====================
  if (uploadState === 'success' && matchResult) {
    const s = matchResult.vocalStats;
    return (
      <div className="w-full max-w-5xl mx-auto mt-6 px-4 animate-in fade-in slide-in-from-bottom-6 duration-700">
        {/* 분석 완료 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="text-emerald-400 font-black text-sm uppercase tracking-widest">보컬 DNA 분석 완료</span>
          </div>
          <button
            onClick={handleReset}
            className="flex items-center space-x-1.5 text-zinc-500 hover:text-zinc-200 text-xs font-bold transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>다른 목소리도 분석해보기</span>
          </button>
        </div>

        {/* 메인 대시보드: 좌우 분할 (데스크탑 5:5, 모바일 세로) */}
        <div className="flex flex-col md:flex-row gap-0 rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl bg-zinc-900">

          {/* ===== 좌측 패널: 앨범 커버 (독립 영역, 텍스트 절대 없음) ===== */}
          <div className="relative w-full md:w-1/2 aspect-square flex-shrink-0 bg-zinc-800">
            {matchResult.albumCoverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={matchResult.albumCoverUrl}
                alt={`${matchResult.title} 앨범 커버`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music className="w-32 h-32 text-zinc-700" />
              </div>
            )}
            {/* 유사도 뱃지 — 이미지 위 좌상단에만 위치 */}
            <div className="absolute top-5 left-5 flex items-center space-x-1.5 bg-black/70 backdrop-blur-md px-4 py-2 rounded-full border border-emerald-500/30">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400 font-black text-sm">유사도 {matchResult.similarityScore}%</span>
            </div>
          </div>

          {/* ===== 우측 패널: 분석 리포트 (스크롤 가능) ===== */}
          <div className="w-full md:w-1/2 flex flex-col overflow-y-auto max-h-[500px] md:max-h-none">
            <div className="flex flex-col h-full p-7 space-y-6">

              {/* [섹션 1] 타이틀 — 보컬 페르소나 강조 */}
              <div className="space-y-2">
                <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.2em]">당신의 목소리 DNA 분석 결과</p>
                <h2 className="text-xl font-black text-white leading-snug">
                  &ldquo;{matchResult.vocalPersona || '분석 중...'}&rdquo;
                </h2>
                {/* 태그 */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {matchResult.voiceTags?.map((tag, i) => (
                    <span key={i} className="text-[10px] font-black px-2.5 py-1 bg-zinc-700/60 text-zinc-300 rounded-md border border-zinc-600/30 tracking-wide">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* [섹션 2] 오디오 특성 바 5종 */}
              {s && (
                <div className="bg-zinc-800/50 border border-zinc-700/40 rounded-2xl p-5 space-y-4">
                  <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">🎛 보컬 특성 분석</p>
                  <StatBar label="따뜻함 (Warmth)"  value={s.warmth}  icon={<Flame   className="w-3 h-3" />} color="bg-gradient-to-r from-orange-600 to-amber-400" />
                  <StatBar label="선명도 (Clarity)" value={s.clarity} icon={<Wind    className="w-3 h-3" />} color="bg-gradient-to-r from-sky-600 to-cyan-400" />
                  <StatBar label="파워 (Power)"     value={s.power}   icon={<Zap     className="w-3 h-3" />} color="bg-gradient-to-r from-purple-600 to-violet-400" />
                  <StatBar label="리듬감 (Rhythm)"  value={s.rhythm}  icon={<Activity className="w-3 h-3" />} color="bg-gradient-to-r from-emerald-600 to-green-400" />
                  <StatBar label="감성 (Emotion)"   value={s.emotion} icon={<Heart   className="w-3 h-3" />} color="bg-gradient-to-r from-pink-600 to-rose-400" />
                </div>
              )}

              {/* [섹션 3] Pitch 게이지 */}
              <div className="bg-zinc-800/50 border border-zinc-700/40 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <Mic2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">음역대 (Pitch)</span>
                  </div>
                  <span className="text-emerald-400 font-black text-sm">{matchResult.pitchHz} Hz</span>
                </div>
                <div className="flex justify-between text-[9px] text-zinc-600 font-bold">
                  <span>저음역 (80Hz)</span><span>고음역 (400Hz)</span>
                </div>
                <div className="relative w-full h-2 bg-zinc-700 rounded-full">
                  <div
                    className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-blue-500 via-emerald-400 to-yellow-400 transition-all duration-1000"
                    style={{ width: `${getPitchPos(matchResult.pitchHz || 0)}%` }}
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full border-2 border-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)] transition-all duration-1000"
                    style={{ left: `calc(${getPitchPos(matchResult.pitchHz || 0)}% - 8px)` }}
                  />
                </div>
              </div>

              {/* [섹션 4] 매칭 곡 & 추천 사유 */}
              <div className="bg-zinc-800/50 border border-zinc-700/40 rounded-2xl p-5 space-y-3">
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">🎵 최적 매칭 곡</p>
                <div>
                  <p className="text-white font-black text-lg leading-tight">{matchResult.title}</p>
                  <p className="text-emerald-500 font-bold text-sm">{matchResult.artist}</p>
                </div>
                <p className="text-zinc-400 text-xs leading-relaxed italic border-t border-zinc-700/40 pt-3">
                  &ldquo;{matchResult.recommendReason}&rdquo;
                </p>
              </div>

              {/* [섹션 5] 버튼 */}
              <div className="space-y-3 pt-1">
                {matchResult.previewUrl && (
                  <button
                    onClick={(e) => { e.stopPropagation(); window.open(matchResult.previewUrl, '_blank', 'noopener,noreferrer'); }}
                    className="w-full flex items-center justify-center space-x-2 py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl text-sm font-black transition-all active:scale-[0.98] shadow-lg shadow-red-600/20"
                  >
                    <Music className="w-4 h-4 fill-current" />
                    <span>🎧 지금 바로 들어보기</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== 업로드 드롭존 ====================
  return (
    <div className="w-full max-w-xl mx-auto mt-8 sm:mt-14 px-4">
      <input
        type="file" ref={fileInputRef} className="hidden"
        accept=".mp3,.m4a,.wav,audio/mpeg,audio/wav,audio/mp4,audio/aac,audio/x-m4a"
        onChange={handleFileChange}
        disabled={uploadState === 'uploading'}
      />
      <div
        className={`
          relative flex flex-col items-center justify-center
          w-full min-h-[22rem] rounded-3xl border-2 border-dashed
          transition-all duration-300 cursor-pointer overflow-hidden p-8
          ${uploadState === 'dragging'  ? 'border-emerald-500 bg-emerald-500/10 scale-[1.02]'
          : uploadState === 'error'     ? 'border-red-500/50 bg-red-950/20 cursor-default'
          : uploadState === 'uploading' ? 'border-zinc-700 bg-zinc-900/60 cursor-default'
          : 'border-zinc-700 bg-zinc-900/30 hover:border-zinc-500 hover:bg-zinc-800/40'}
        `}
        onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
        onClick={() => { if (uploadState === 'idle' || uploadState === 'dragging') fileInputRef.current?.click(); }}
      >
        {uploadState === 'uploading' ? (
          <div className="flex flex-col items-center space-y-6 animate-in fade-in duration-500">
            <div className="relative">
              <div className="absolute inset-0 rounded-full blur-2xl bg-emerald-500/25 animate-pulse" />
              <div className="w-20 h-20 border-4 border-zinc-700 border-t-emerald-500 rounded-full animate-spin" />
              <Mic2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-emerald-400" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-xl font-black text-white">보컬 DNA를 분석 중입니다...</p>
              <p className="text-sm text-zinc-500">음역대, 음색, 5가지 특성을 AI가 추출하고 있어요.</p>
            </div>
          </div>
        ) : uploadState === 'error' ? (
          <div className="flex flex-col items-center space-y-4">
            <AlertCircle className="w-14 h-14 text-red-500" />
            <p className="text-red-400 font-bold text-center text-sm px-4">{errorMessage}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-6 pointer-events-none text-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-full blur-xl bg-zinc-700/30" />
              <div className="relative p-6 bg-gradient-to-b from-zinc-800 to-zinc-900 rounded-full ring-1 ring-white/10 shadow-xl">
                <UploadCloud className="w-12 h-12 text-emerald-400" strokeWidth={1.5} />
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-2xl font-black text-white tracking-tight">
                목소리 DNA를 <span className="text-emerald-400">분석</span>해드릴게요
              </p>
              <p className="text-sm text-zinc-500 font-bold">
                파일을 드래그하거나 클릭하여 업로드<br />
                <span className="opacity-60 font-normal text-xs">지원 형식: .mp3 · .m4a · .wav · 최대 50MB</span>
              </p>
            </div>
            <div className="mt-2 px-8 py-3 bg-zinc-800 text-zinc-300 rounded-full text-sm font-bold border border-zinc-700 pointer-events-auto">
              파일 선택하기
            </div>
          </div>
        )}
      </div>
    </div>
  );
}