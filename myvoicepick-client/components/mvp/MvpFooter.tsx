import React from 'react';
import Link from 'next/link';

export const MvpFooter: React.FC = () => {
  return (
    <footer className="bg-[var(--mvp-bg)] pt-[100px] pb-[60px] border-t border-white/5">
      <div className="mvp-container grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="col-span-1 md:col-span-1">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-gradient-to-tr from-[var(--mvp-primary)] to-[var(--mvp-secondary)] rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
              </svg>
            </div>
            <span className="text-xl font-bold mvp-title">MyVoicePick</span>
          </div>
          <p className="text-sm text-[var(--mvp-text-muted)] max-w-xs">
            Advanced Vocal Intelligence for the next generation of artists and producers.
          </p>
        </div>
        <div>
          <h4 className="font-bold mb-6">Product</h4>
          <ul className="space-y-4 text-sm text-[var(--mvp-text-muted)]">
            <li className="hover:text-white cursor-pointer"><Link href="/analyze">Analyze</Link></li>
            <li className="hover:text-white cursor-pointer"><Link href="/features">Features</Link></li>
            <li className="hover:text-white cursor-pointer"><Link href="/features#artists">Artist Lab</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold mb-6">Resources</h4>
          <ul className="space-y-4 text-sm text-[var(--mvp-text-muted)]">
            <li className="hover:text-white"><Link href="#">Discord Community</Link></li>
            <li className="hover:text-white"><Link href="/guide">Vocal Guide</Link></li>
            <li className="hover:text-white"><Link href="/api-docs">API Docs</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold mb-6">Legal</h4>
          <ul className="space-y-4 text-sm text-[var(--mvp-text-muted)]">
            <li className="hover:text-white"><Link href="#">Privacy Policy</Link></li>
            <li className="hover:text-white"><Link href="#">Terms of Service</Link></li>
            <li className="hover:text-white"><Link href="#">Refund Policy</Link></li>
          </ul>
        </div>
      </div>
      <div className="mvp-container mt-[80px] pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-[var(--mvp-text-muted)]">
        <span>&copy; 2026 MyVoicePick. All rights reserved.</span>
      </div>
    </footer>
  );
};
