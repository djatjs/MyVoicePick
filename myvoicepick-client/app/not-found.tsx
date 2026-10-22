import Link from 'next/link';
import '../styles/mvp-design.css';
import '../styles/workspace.css';
import { MvpNav } from '../components/mvp/MvpNav';
import { MvpFooter } from '../components/mvp/MvpFooter';

export default function NotFound() {
  return <div className="mvp-canvas workspace-page min-h-screen flex flex-col"><MvpNav /><main className="workspace-container"><section className="workspace-panel workspace-empty"><p className="workspace-kicker">404 · 페이지를 찾을 수 없어요</p><h1>다른 곳에서<br />발견을 이어가세요.</h1><p>주소가 잘못되었거나 더 이상 제공하지 않는 페이지입니다.</p><Link href="/" className="workspace-primary">메인으로 돌아가기</Link></section></main><MvpFooter /></div>;
}
