import { VocalMatchSummary } from '../mvp/VocalMatchSummary';

export function DashboardPreview() {
  return <VocalMatchSummary result={{ artist: '성시경', title: '너의 모든 순간', similarityScore: 92 }} example />;
}
