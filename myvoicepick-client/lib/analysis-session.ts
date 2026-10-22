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
  return saved === '/analyze' ? '/analyze' : '/mypage';
}
