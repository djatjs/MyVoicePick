export async function verifyAnalysisSession(token: string | null, request: typeof fetch = fetch) {
  if (!token) return 'anonymous';
  try {
    const response = await request('/api/v1/users/me', { headers: { Authorization: `Bearer ${token}` } });
    if (response.status === 401) return 'anonymous';
    return response.ok ? 'authenticated' : 'error';
  } catch {
    return 'error';
  }
}

export function loginDestination(saved: string | null) {
  return saved === '/analyze' || saved === '/pricing' ? saved : '/mypage';
}

export function subscribeToLogin(listener: () => void) {
  window.addEventListener('storage', listener);
  return () => window.removeEventListener('storage', listener);
}

export function hasLoginToken() {
  return Boolean(localStorage.getItem('accessToken'));
}

export function setLoginToken(token: string | null) {
  if (token) localStorage.setItem('accessToken', token);
  else localStorage.removeItem('accessToken');
  window.dispatchEvent(new Event('storage'));
}

export type AnalysisPoll =
  | { kind: 'completed'; data: Awaited<ReturnType<Response['json']>> }
  | { kind: 'failed'; message: string }
  | { kind: 'waiting'; queued: boolean }
  | { kind: 'retry' };

// Only the server's FAILED, a lost login or a missing task end the wait; a passing network or proxy error does not stop the analysis.
export async function readAnalysisPoll(res: Response | null): Promise<AnalysisPoll> {
  if (res?.status === 401) return { kind: 'failed', message: '로그인이 필요합니다. 로그인 후 결과를 다시 열어주세요.' };
  if (res?.status === 404) return { kind: 'failed', message: '분석 기록을 찾을 수 없습니다. 마이페이지에서 확인해주세요.' };
  if (!res?.ok) return { kind: 'retry' };
  const data = await res.json().catch(() => null);
  if (data?.status === 'COMPLETED') return { kind: 'completed', data };
  if (data?.status === 'FAILED') return { kind: 'failed', message: '음성을 분석하지 못했습니다. 목소리가 잘 들리는 다른 파일로 다시 시도해주세요.' };
  if (data?.status === 'PENDING' || data?.status === 'PROCESSING') return { kind: 'waiting', queued: data.status === 'PENDING' };
  return { kind: 'retry' };
}
