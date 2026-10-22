import Link from 'next/link';

export function MvpFooter() {
  return (
    <footer className="border-t border-white/5 py-10 bg-[var(--mvp-bg)]">
      <div className="mvp-container grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
        <div className="col-span-2"><Link href="/" className="text-xl font-bold mvp-title">MyVoicePick</Link><p className="text-[var(--mvp-text-muted)] mt-3 leading-relaxed">내 목소리로 찾는 새로운 곡.<br />나와 닮은 가수부터 다음에 부를 노래까지.</p></div>
        <nav aria-label="서비스 바로가기"><h2 className="font-semibold mb-4">서비스</h2><ul className="space-y-3 text-[var(--mvp-text-muted)]"><li><Link href="/analyze">목소리 분석</Link></li><li><Link href="/mypage">나의 보컬 기록</Link></li><li><Link href="/pricing">요금제 비교</Link></li></ul></nav>
        <nav aria-label="도움말 바로가기"><h2 className="font-semibold mb-4">알아보기</h2><ul className="space-y-3 text-[var(--mvp-text-muted)]"><li><Link href="/features">분석 소개</Link></li><li><Link href="/guide">이용 가이드</Link></li><li><Link href="/api-docs">API 안내</Link></li></ul></nav>
      </div>
      <div className="mvp-container mt-8 pt-6 border-t border-white/5 text-xs text-[var(--mvp-text-muted)]">© 2026 MyVoicePick</div>
    </footer>
  );
}
