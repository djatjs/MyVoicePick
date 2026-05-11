// ProfileHeader.tsx
import Link from 'next/link';
import { MvpButton } from '../../components/mvp/MvpButton';
import { Star } from 'lucide-react';

interface Props {
  userEmail: string | null;
  userPlan: string;
}

/**
 * 프로필 헤더 컴포넌트
 * - 이메일과 플랜을 표시하고, 분석 시작 버튼을 제공합니다.
 * - 플랜이 FREE인 경우 별 아이콘과 라벨을 함께 보여줍니다.
 */
export default function ProfileHeader({ userEmail, userPlan }: Props) {
  return (
    <section className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/5 pb-12">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
            <Star className="w-3 h-3" /> {userPlan} Member
          </div>
        </div>
        <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter">
          {userEmail?.split('@')[0]}<span className="text-white/20">.studio</span>
        </h1>
        <p className="text-[var(--mvp-text-muted)] text-xl font-medium max-w-2xl break-keep">
          분석된 보컬 페르소나는 <span className="text-white font-bold">기록</span>되고,<br className="hidden md:block" /> 음악적 가능성은 <span className="text-white font-bold">확장</span>됩니다.
        </p>
      </div>
      <div className="flex gap-4">
        <Link href="/analyze">
          <MvpButton className="h-14 px-8 text-sm font-black uppercase tracking-widest shadow-[0_8px_20px_rgba(99,102,241,0.3)]">
            분석 시작하기
          </MvpButton>
        </Link>
      </div>
    </section>
  );
}
