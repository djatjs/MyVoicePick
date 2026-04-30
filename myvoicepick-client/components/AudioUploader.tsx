'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, Loader2, AlertCircle, CheckCircle2, Music } from 'lucide-react'; // Music 아이콘 추가

type UploadState = 'idle' | 'dragging' | 'uploading' | 'success' | 'error';

// 결과 데이터를 담을 타입 선언
interface MatchResult {
  title: string;
  artist: string;
}

export default function AudioUploader() {
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null); // 결과 저장용 상태 추가
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
    const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!SUPPORTED_FORMATS.includes(file.type) && !SUPPORTED_EXTENSIONS.includes(extension)) {
      return '지원하지 않는 파일 형식입니다. (.mp3, .m4a, .wav만 가능)';
    }
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return '파일 크기는 50MB를 초과할 수 없습니다.';
    }
    return null;
  };

  const pollStatus = async (taskId: string) => {
    try {
      const statusRes = await fetch(`/api/v1/analyze/${taskId}/status`);
      if (!statusRes.ok) throw new Error(`상태 조회 실패 (${statusRes.status})`);

      const statusData = await statusRes.json();

      if (statusData.status === 'COMPLETED') {
        // 백엔드가 준 제목과 아티스트 데이터를 State에 저장!
        setMatchResult({
          title: statusData.matchedSongTitle || '제목 없음',
          artist: statusData.matchedArtist || '아티스트 미상'
        });
        setUploadState('success');
      } else if (statusData.status === 'FAILED') {
        throw new Error('분석에 실패했습니다.');
      } else {
        setTimeout(() => pollStatus(taskId), 3000);
      }
    } catch (err: unknown) {
      setUploadState('error');
      setErrorMessage(err instanceof Error ? err.message : '상태를 확인하는 중 오류가 발생했습니다.');
      setTimeout(() => setUploadState('idle'), 3000);
    }
  };

  const processFile = async (file: File) => {
    const error = validateFile(file);
    if (error) {
      setErrorMessage(error);
      setUploadState('error');
      setTimeout(() => { setUploadState('idle'); setErrorMessage(''); }, 3000);
      return;
    }

    setUploadState('uploading');
    setErrorMessage('');
    setMatchResult(null); // 이전 결과 초기화

    try {
      const formData = new FormData();
      formData.append('userId', '1');
      formData.append('file', file);

      const uploadRes = await fetch('/api/v1/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) throw new Error(`서버 전송 실패 (${uploadRes.status})`);

      const uploadData = await uploadRes.json();
      if (!uploadData.taskId) throw new Error('서버로부터 taskId를 받지 못했습니다.');

      pollStatus(uploadData.taskId);

    } catch (err: unknown) {
      setUploadState('error');
      setErrorMessage(err instanceof Error ? err.message : '파일 업로드 중 오류가 발생했습니다.');
      setTimeout(() => setUploadState('idle'), 3000);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (uploadState === 'uploading') return;
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) processFile(droppedFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) processFile(selectedFile);
    e.target.value = '';
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-8 sm:mt-12 px-4 sm:px-6">
      <div
        className={`
          relative flex flex-col items-center justify-center
          w-full min-h-[20rem] rounded-3xl border-2 border-dashed
          transition-all duration-300 ease-in-out cursor-pointer
          overflow-hidden shadow-sm p-6
          ${uploadState === 'dragging'
            ? 'border-zinc-400 bg-zinc-800/60 scale-[1.01]'
            : uploadState === 'error'
              ? 'border-red-500/50 bg-red-950/20'
              : uploadState === 'uploading' || uploadState === 'success'
                ? 'border-zinc-700 bg-zinc-900/50 cursor-default'
                : 'border-zinc-700 bg-zinc-900/30 hover:border-zinc-500 hover:bg-zinc-800/40'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (uploadState !== 'uploading' && uploadState !== 'success') {
            fileInputRef.current?.click();
          }
        }}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".mp3,.m4a,.wav,audio/mpeg,audio/wav,audio/mp4,audio/aac,audio/x-m4a"
          onChange={handleFileChange}
          disabled={uploadState === 'uploading' || uploadState === 'success'}
        />

        {uploadState === 'uploading' ? (
          <div className="flex flex-col items-center justify-center space-y-5 animate-in fade-in duration-500">
            <div className="relative">
              <div className="absolute inset-0 rounded-full blur-md bg-zinc-500/20 animate-pulse"></div>
              <Loader2 className="w-12 h-12 text-zinc-300 animate-spin relative z-10" />
            </div>
            <div className="text-center space-y-1.5">
              <p className="text-lg font-medium text-zinc-100 tracking-tight">목소리를 분석 중입니다...</p>
              <p className="text-sm text-zinc-400">AI가 음역대와 음색을 추출하고 있습니다.</p>
            </div>
          </div>
        ) : uploadState === 'error' ? (
          <div className="flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-300">
            <div className="p-3 bg-red-500/10 rounded-full">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <p className="text-red-400 font-medium text-center px-6">{errorMessage}</p>
          </div>
        ) : uploadState === 'success' && matchResult ? (
          // 🎉 [하이라이트] 최종 결과를 예쁘게 보여주는 카드 UI 🎉
          <div className="flex flex-col items-center justify-center space-y-6 animate-in zoom-in-95 duration-500 w-full">
            <div className="flex flex-col items-center space-y-2">
              <div className="p-3 bg-green-500/10 rounded-full mb-2">
                <CheckCircle2 className="w-10 h-10 text-green-400" />
              </div>
              <p className="text-green-400 font-semibold text-lg">분석 완료!</p>
              <p className="text-zinc-400 text-sm">당신의 목소리와 가장 닮은 아티스트는...</p>
            </div>

            {/* 결과 카드 */}
            <div className="w-full max-w-sm bg-zinc-800/80 border border-zinc-700/50 rounded-2xl p-6 text-center shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-emerald-500"></div>
              <Music className="w-8 h-8 text-zinc-500 mx-auto mb-3" />
              <h3 className="text-2xl font-bold text-white mb-1">{matchResult.title}</h3>
              <p className="text-lg text-emerald-400 font-medium">{matchResult.artist}</p>
            </div>

            <button
              onClick={(e) => { e.stopPropagation(); setUploadState('idle'); }}
              className="mt-4 px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-full text-sm font-medium transition-colors"
            >
              다른 파일 분석하기
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-5 pointer-events-none p-6">
            <div className="p-4 bg-zinc-800/60 rounded-full shadow-inner ring-1 ring-white/5">
              <UploadCloud className="w-10 h-10 text-zinc-300" strokeWidth={1.5} />
            </div>
            <div className="text-center space-y-2">
              <p className="text-zinc-200 font-medium sm:text-lg tracking-tight">
                오디오 파일을 이곳에 <span className="text-white font-semibold">드래그</span>하거나 <span className="text-white font-semibold underline underline-offset-4 decoration-zinc-600">클릭</span>하여 업로드하세요
              </p>
              <p className="text-xs sm:text-sm text-zinc-500 font-medium">
                지원 포맷: .mp3, .m4a, .wav
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}