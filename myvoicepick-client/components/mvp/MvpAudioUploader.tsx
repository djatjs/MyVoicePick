"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { UploadCloud, Loader2, AlertCircle } from 'lucide-react';
import { AnalysisResult, type MatchResult } from './AnalysisResult';
import { verifyAnalysisSession, setLoginToken } from '../../lib/analysis-session';
import { TossPaymentModal } from './TossPaymentModal';

type UploadState = 'idle' | 'dragging' | 'uploading' | 'processing' | 'success' | 'error';

export default function MvpAudioUploader() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const taskId = searchParams.get('taskId');
  const [uploadState, setUploadState] = useState<UploadState>(taskId ? 'processing' : 'idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [session, setSession] = useState<'loading' | 'authenticated' | 'anonymous' | 'error'>('loading');
  const [sessionRevision, setSessionRevision] = useState(0);
  const isBusy = uploadState === 'uploading' || uploadState === 'processing';

  useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem('accessToken');
    async function checkSession() {
      const status = await verifyAnalysisSession(token);
      if (cancelled) return;
      if (status === 'anonymous' && localStorage.getItem('accessToken') === token) {
        setLoginToken(null);
      }
      setSession(status);
    }
    void checkSession();
    return () => { cancelled = true; };
  }, [sessionRevision]);

  function rememberAnalysisReturn() {
    sessionStorage.setItem('loginReturnTo', '/analyze');
  }

  useEffect(() => {
    if (!taskId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const token = localStorage.getItem('accessToken');
        const res = await fetch(`/api/v1/analyze/${encodeURIComponent(taskId!)}/status`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error(res.status === 401 ? '로그인이 필요합니다. 로그인 후 결과를 다시 열어주세요.' : '결과를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
        const data = await res.json();
        if (cancelled) return;
        if (data.status === 'COMPLETED') {
          setMatchResult({
            title: data.matchedSongTitle || data.title || '제목 없음',
            artist: data.matchedArtist || data.artist || '아티스트 미상',
            previewUrl: data.previewUrl || data.preview_url,
            voiceTags: data.voiceTags || [],
            similarityScore: data.similarityScore,
            pitchHz: data.pitchHz,
            recommendReason: data.recommendReason,
            vocalPersona: data.vocalPersona,
            vocalStats: data.vocalStats,
            userPlan: data.userPlan || 'FREE',
            proFeatures: data.proFeatures,
          });
          setUploadState('success');
        } else if (data.status === 'FAILED') {
          throw new Error('음성을 분석하지 못했습니다. 목소리가 잘 들리는 다른 파일로 다시 시도해주세요.');
        } else {
          setUploadState('processing');
          timer = setTimeout(poll, 3000);
        }
      } catch (error) {
        if (cancelled) return;
        setErrorMessage(error instanceof Error ? error.message : '결과를 불러오지 못했습니다.');
        setUploadState('error');
      }
    }
    void poll();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [taskId]);

  async function processFile(file: File) {
    if (isBusy || session !== 'authenticated') return;
    const token = localStorage.getItem('accessToken');
    if (!token) { rememberAnalysisReturn(); router.push('/login'); return; }
    setErrorMessage('');
    setMatchResult(null);
    setUploadState('uploading');
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/v1/analyze', { method: 'POST', body: form, headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || '파일을 업로드하지 못했습니다. 잠시 후 다시 시도해주세요.');
      }
      const data = await res.json();
      if (!data.taskId) throw new Error('분석 작업을 시작하지 못했습니다. 다시 시도해주세요.');
      setUploadState('processing');
      router.replace(`/analyze?taskId=${encodeURIComponent(data.taskId)}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '파일을 업로드하지 못했습니다.');
      setUploadState('error');
    }
  }

  function reset() {
    setUploadState('idle');
    setMatchResult(null);
    setErrorMessage('');
    router.replace('/analyze');
  }

  return (
    <>
      <div className={uploadState === 'success' ? '' : 'workspace-analysis-start'}>
      <header className="workspace-heading workspace-profile">
        <div><p className="workspace-kicker">내 목소리로 찾는 새로운 곡</p><h1>{uploadState === 'success' ? '나의 보컬 분석 결과' : '내 목소리 분석하기'}</h1><p className="workspace-description">{uploadState === 'success' ? '닮은 가수와 추천곡을 확인하고, 다음에 부를 노래를 골라보세요.' : '노래한 파일에서 나와 닮은 가수와 어울리는 곡을 찾아보세요.'}</p></div>
        {uploadState === 'success' && <button className="workspace-secondary" onClick={reset}>새로 분석하기</button>}
      </header>
      {uploadState === 'success' && matchResult ? <AnalysisResult result={matchResult} onUpgrade={() => setIsModalOpen(true)} /> : (
        <>
          <section className={`workspace-upload workspace-panel ${uploadState === 'dragging' ? 'workspace-dragging' : ''}`}
            onDragOver={event => { event.preventDefault(); if (!isBusy && session === 'authenticated') setUploadState('dragging'); }}
            onDragLeave={() => { if (uploadState === 'dragging') setUploadState('idle'); }}
            onDrop={event => { event.preventDefault(); const file = event.dataTransfer.files[0]; if (file && !isBusy) void processFile(file); }}>
            <input type="file" ref={fileInputRef} className="sr-only" tabIndex={-1} aria-label="분석할 음성 파일" accept=".mp3,.wav,.m4a" disabled={isBusy || session !== 'authenticated'} onChange={event => { const file = event.target.files?.[0]; if (file) void processFile(file); event.target.value = ''; }} />
            {isBusy ? <div role="status" aria-live="polite"><Loader2 className="workspace-upload-icon animate-spin" aria-hidden="true" /><h2>{uploadState === 'uploading' ? '파일을 업로드하고 있어요' : '목소리를 분석하고 있어요'}</h2><p className="workspace-description">{uploadState === 'uploading' ? '파일을 서버로 전송하고 있습니다.' : '분석을 준비하거나 음성의 특징을 비교하고 있습니다. 완료되면 결과를 보여드릴게요.'}</p></div> : uploadState === 'error' ? <div role="alert"><AlertCircle className="workspace-upload-icon" aria-hidden="true" /><h2>분석을 완료하지 못했어요</h2><p className="workspace-description">{errorMessage}</p><button className="workspace-primary" onClick={reset}>다시 시작하기</button><Link className="workspace-inline-link" href="/login" onClick={rememberAnalysisReturn}>로그인하기</Link></div> : <div>
              <UploadCloud className="workspace-upload-icon" aria-hidden="true" />
              <h2>{session === 'anonymous' ? '로그인하고 내 목소리를 발견해보세요' : '노래한 파일을 여기에 놓아주세요'}</h2>
              <p className="workspace-description">{session === 'anonymous' ? '분석 결과를 계정에 저장하고 언제든 다시 확인할 수 있어요.' : '또는 아래 버튼으로 파일을 선택하세요.'}</p>
              {session === 'loading' ? <button className="workspace-primary" disabled>로그인 상태 확인 중</button>
                : session === 'anonymous' ? <Link className="workspace-primary" href="/login" onClick={rememberAnalysisReturn}>로그인하고 분석 시작하기</Link>
                : session === 'error' ? <div role="alert"><p className="workspace-note">로그인 상태를 확인하지 못했어요. 잠시 후 다시 시도해주세요.</p><button className="workspace-secondary" onClick={() => setSessionRevision(value => value + 1)}>다시 확인하기</button></div>
                : <button className="workspace-primary" onClick={() => fileInputRef.current?.click()}>파일 선택하고 분석하기</button>}
              <p className="workspace-note">MP3 · WAV · M4A · 50MB 미만{session === 'authenticated' ? ' · 선택하면 분석을 시작합니다.' : ''}</p>
            </div>}

          </section>
          <div className="workspace-upload-help">
            <div><h3>목소리가 선명하게 들리는 녹음을 준비하세요</h3><p>주변 소음과 반주가 적은 파일을 권장합니다.{session === 'authenticated' && ' 분석 결과는 마이페이지에 저장됩니다.'}</p></div>
            <Link className="workspace-inline-link" href="/guide">업로드 가이드</Link>
          </div>
        </>
      )}
      </div>
      <TossPaymentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} plan="PRO" />
    </>
  );
}
