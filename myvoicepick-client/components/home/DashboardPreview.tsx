"use client";

import React, { useState, useEffect } from 'react';
import { Activity, Mic, BarChart3, Star, Music } from 'lucide-react';

export function DashboardPreview() {
  const [pitch, setPitch] = useState(0);
  const [similarity, setSimilarity] = useState(0);

  // 시뮬레이션: 숫자가 올라가는 애니메이션 효과
  useEffect(() => {
    const timer = setInterval(() => {
      setPitch(prev => (prev < 440 ? prev + 11 : 440));
      setSimilarity(prev => (prev < 92 ? prev + 1 : 92));
    }, 50);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="pt-24 pb-[120px] relative z-10 overflow-hidden">
      <div className="mvp-container">
        <div className="text-center mb-12">
          <span className="text-indigo-400 font-bold tracking-widest uppercase text-xs">Inside the Engine</span>
          <h2 className="text-4xl font-black mt-2">정밀한 분석, <span className="mvp-gradient-text">직관적인 결과</span></h2>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-center">
          {/* 왼쪽: 분석 카트 (UI Mockup) */}
          <div className="lg:col-span-7 relative group">
            <div className="mvp-glass-card overflow-hidden border-white/10 shadow-2xl relative">
              {/* 상단 바 */}
              <div className="h-10 bg-white/5 border-b border-white/5 flex items-center px-4 gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500/50"></div>
                <div className="w-2 h-2 rounded-full bg-yellow-500/50"></div>
                <div className="w-2 h-2 rounded-full bg-green-500/50"></div>
                <div className="ml-4 text-[10px] text-white/20 font-mono">analysis_v2.0_stable</div>
              </div>

              {/* 메인 콘텐츠 영역 */}
              <div className="p-6 md:p-10 bg-gradient-to-br from-indigo-500/5 to-transparent">
                <div className="flex flex-col md:flex-row gap-8 items-center">
                  {/* 시각화 원형 차트 */}
                  <div className="relative w-48 h-48 flex items-center justify-center">
                    <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div>
                    <div
                      className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"
                      style={{ animationDuration: '3s' }}
                    ></div>
                    <div className="text-center">
                      <div className="text-3xl font-black text-white">{similarity}%</div>
                      <div className="text-[10px] text-indigo-300 uppercase tracking-tighter">Similarity</div>
                    </div>
                  </div>

                  {/* 데이터 리스트 */}
                  <div className="flex-1 space-y-6 w-full">
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-white/60">Vocal Pitch (F0)</span>
                        <span className="text-indigo-400">{pitch} Hz</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 transition-all duration-500 ease-out"
                          style={{ width: `${(pitch / 600) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-white/60">Harmonics / Resonance</span>
                        <span className="text-violet-400">Stable</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-violet-500 w-[78%]"></div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4">
                      <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                        <Mic className="w-4 h-4 text-indigo-400 mb-2" />
                        <div className="text-[10px] text-white/40 uppercase">Vocal Type</div>
                        <div className="text-sm font-bold text-white">Lyrical Tenor</div>
                      </div>
                      <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                        <Activity className="w-4 h-4 text-pink-400 mb-2" />
                        <div className="text-[10px] text-white/40 uppercase">Tone Color</div>
                        <div className="text-sm font-bold text-white">Warm & Airy</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 장식용 글로우 */}
            <div className="absolute -z-10 inset-0 bg-indigo-500/20 blur-[100px] rounded-full scale-75 opacity-50"></div>
          </div>

          {/* 오른쪽: 설명 텍스트 */}
          <div className="lg:col-span-5 space-y-8">
            <div className="space-y-4">
              {/* <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                <BarChart3 className="text-indigo-400" />
              </div> */}
              <h3 className="text-3xl font-bold leading-tight">데이터로 증명하는 <br />당신의 목소리</h3>
              <p className="text-[var(--mvp-text-muted)] leading-relaxed">
                단순히 '비슷하다'는 느낌을 넘어, 주파수 대역별 특징과 발성 메커니즘을 분석합니다.
                전문적인 보컬 트레이너가 옆에 있는 것처럼 당신의 강점과 보완점을 수치로 보여드립니다.
              </p>
            </div>

            <ul className="space-y-4">
              {[
                { icon: <Star className="w-4 h-4" />, text: "실시간 스펙트럼 데이터 시각화" },
                { icon: <Music className="w-4 h-4" />, text: "12가지 보컬 페르소나 매칭" },
                { icon: <Activity className="w-4 h-4" />, text: "정밀한 음역대(Vocal Range) 측정" },
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-sm font-medium text-white/80">
                  <span className="w-6 h-6 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                    {item.icon}
                  </span>
                  {item.text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
