"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { UploadCloud, Loader2, AlertCircle } from 'lucide-react';
import { AnalysisResult, type MatchResult } from './AnalysisResult';
import { verifyAnalysisSession, setLoginToken, readAnalysisPoll } from '../../lib/analysis-session';
import { TossPaymentModal } from './TossPaymentModal';

type UploadState = 'idle' | 'dragging' | 'uploading' | 'processing' | 'success' | 'error';
// a 4-minute recording usually takes about 3 minutes
const SLOW_AFTER_MS = 5 * 60 * 1000;

export default function MvpAudioUploader() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const taskId = searchParams.get('taskId');
  const [uploadState, setUploadState] = useState<UploadState>(taskId ? 'processing' : 'idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [queued, setQueued] = useState(false);
  const [slow, setSlow] = useState(false);
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
    const startedAt = Date.now();
    async function poll() {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/v1/analyses/${encodeURIComponent(taskId!)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }).catch(() => null);
      const result = await readAnalysisPoll(res);
      if (cancelled) return;
      if (result.kind === 'completed') {
        const { data } = result;
        setMatchResult({
          title: data.matchedSongTitle || data.title || '제목 없음',
          artist: data.matchedArtist || data.artist || '아티스트 미상',
          previewUrl: data.previewUrl || data.preview_url,
          albumCoverUrl: data.albumCoverUrl,
          similarityScore: data.similarityScore,
          pitchHz: data.pitchHz,
          recommendReason: data.recommendReason,
          vocalStats: data.vocalStats,
          userPlan: data.userPlan || 'FREE',
          proFeatures: data.proFeatures,
        });
        setUploadState('success');
      } else if (result.kind === 'failed') {
        setErrorMessage(result.message);
        setNotFound(res?.status === 404);
        setUploadState('error');
      } else {
        // the analysis keeps running on the server, so keep checking; back off after a passing error
        if (result.kind === 'waiting') setQueued(result.queued);
        if (Date.now() - startedAt > SLOW_AFTER_MS) setSlow(true);
        setUploadState('processing');
        timer = setTimeout(poll, result.kind === 'retry' ? 10000 : 3000);
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
    setNotFound(false);
    setMatchResult(null);
    setQueued(false);
    setSlow(false);
    setUploadState('uploading');
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/v1/analyses', { method: 'POST', body: form, headers: { Authorization: `Bearer ${token}` } });
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
            {isBusy ? <div role="status" aria-live="polite"><Loader2 className="workspace-upload-icon animate-spin" aria-hidden="true" /><h2>{uploadState === 'uploading' ? '파일을 업로드하고 있어요' : queued ? '분석 순서를 기다리고 있어요' : '목소리를 분석하고 있어요'}</h2><p className="workspace-description">{uploadState === 'uploading' ? '파일을 서버로 전송하고 있습니다.' : slow ? '평소보다 오래 걸리고 있어요. 이 페이지를 나가도 분석은 계속되고, 결과는 마이페이지에서 확인할 수 있어요.' : '분석을 준비하거나 음성의 특징을 비교하고 있습니다. 완료되면 결과를 보여드릴게요.'}</p></div> : uploadState === 'error' ? <div role="alert"><AlertCircle className="workspace-upload-icon" aria-hidden="true" /><h2>{notFound ? '분석 기록을 찾을 수 없어요' : '분석을 완료하지 못했어요'}</h2><p className="workspace-description">{errorMessage}</p><button className="workspace-primary" onClick={reset}>{notFound ? '새로 분석하기' : '다시 시작하기'}</button>{session === 'authenticated' ? <Link className="workspace-inline-link" href="/mypage">마이페이지에서 기록 보기</Link> : <Link className="workspace-inline-link" href="/login" onClick={rememberAnalysisReturn}>로그인하기</Link>}</div> : <div>
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
