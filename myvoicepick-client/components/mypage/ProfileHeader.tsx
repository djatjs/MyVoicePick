import Link from 'next/link';

interface Props { userEmail: string | null; userPlan: string; }

export default function ProfileHeader({ userEmail, userPlan }: Props) {
  return (
    <header className="workspace-heading workspace-profile">
      <div><p className="workspace-kicker">내 목소리로 쌓아가는 발견</p><h1>나의 보컬 기록</h1><p className="workspace-account">{userEmail} <span className="workspace-badge">{userPlan ? `${userPlan} 플랜` : '계정 확인 중'}</span></p></div>
      <Link href="/analyze" className="workspace-primary">새로 분석하기</Link>
    </header>
  );
}
