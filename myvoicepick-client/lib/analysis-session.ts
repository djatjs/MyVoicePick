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
