import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

export function CtaSection() {
  return (
    <section className="mvp-container home-closing">
      <div><p className="home-intro">다음 곡은, 나답게.</p><h2>당신의 목소리로<br />시작해보세요.</h2></div>
      <Link href="/analyze" className="home-primary">내 목소리 분석하기 <ArrowUpRight size={19} aria-hidden="true" /></Link>
    </section>
  );
}
