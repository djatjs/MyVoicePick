import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const load = createRequire(import.meta.url);

load.extensions['.tsx'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    fileName: filename,
  });
  module._compile(outputText, filename);
};
load.extensions['.ts'] = load.extensions['.tsx'];
const { AnalysisResult } = load('../components/mvp/AnalysisResult.tsx');
const render = (result) => renderToStaticMarkup(React.createElement(AnalysisResult, { result, onUpgrade: () => {} }));
const minimal = { title: '추천곡', artist: '가수' };
const missing = render(minimal);
assert.match(missing, /disabled=""/);
assert.match(missing, /상세 음성 데이터가 없습니다/);
assert.doesNotMatch(missing, /undefined|NaN|분석 중/);
const full = render({ ...minimal, previewUrl: 'https://example.com/audio', similarityScore: 92, userPlan: 'PRO', proFeatures: { key: '-2', guide: '연습 안내', playlist: [] }, vocalStats: { warmth: 70, clarity: 80, power: 60, rhythm: 50, emotion: 90, dna_128_points: Array(128).fill(40) } });
assert.match(full, /미리듣기/);
assert.match(full, /연습 안내/);
assert.match(full, /상세 음성 데이터 보기/);
assert.doesNotMatch(full, /Pro 기능 알아보기|disabled=""/);
assert.match(render({ ...minimal, userPlan: 'STUDIO', proFeatures: { key: 'C', guide: 'Studio 안내', playlist: [] } }), /Studio 안내/);
assert.match(render({ ...minimal, similarityScore: 0 }), /0<span>%/);
assert.match(render({ ...minimal, userPlan: 'PRO' }), /추천 키가 없습니다/);
const { DashboardPreview } = load('../components/home/DashboardPreview.tsx');
const example = renderToStaticMarkup(React.createElement(DashboardPreview));
for (const label of ['나의 보컬 리포트', '나와 닮은 가수', '음색 유사도', '추천곡']) {
  assert.ok(example.includes(label) && missing.includes(label));
}
assert.match(example, /결과 예시/);
assert.match(missing, /분석 완료/);
assert.doesNotMatch(missing, /vocal-wave/);
const { PricingSection } = load('../components/home/PricingSection.tsx');
const pricing = renderToStaticMarkup(React.createElement(PricingSection));
assert.match(pricing, /href="\/analyze"/);
assert.match(pricing, /테스트 금액 100원/);
assert.match(pricing, /Pro 테스트 결제하기/);
assert.match(pricing, /disabled="">준비 중/);
assert.doesNotMatch(pricing, /5만|99\.9|일일 3회|Most Popular/);
console.log('Analysis result: missing data, preview, Pro and Studio checks passed.');

const { MvpFooter } = load('../components/mvp/MvpFooter.tsx');
const footer = renderToStaticMarkup(React.createElement(MvpFooter));
assert.doesNotMatch(footer, /href="#"/);
assert.match(footer, /href="\/guide"/);
const { PaymentCheckout } = load('../components/mvp/PaymentCheckout.tsx');
const checkout = renderToStaticMarkup(React.createElement(PaymentCheckout, { plan: 'PRO', amount: 100 }));
assert.match(checkout, /테스트 금액 100원/);
assert.match(checkout, /disabled=""/);
const direct = renderToStaticMarkup(React.createElement(PaymentCheckout, { plan: 'STUDIO', amount: 49000 }));
assert.match(direct, /49,000/);
assert.doesNotMatch(direct, /테스트 금액 100원/);
const { PaymentResult } = load('../components/mvp/PaymentResult.tsx');
const success = renderToStaticMarkup(React.createElement(PaymentResult, { status: 'success', plan: 'PRO', amount: '100' }));
assert.match(success, /결제 승인 완료/);
assert.match(success, /100원/);
const failure = renderToStaticMarkup(React.createElement(PaymentResult, { status: 'error' }));
assert.match(failure, /다시 결제하기 전에/);
assert.doesNotMatch(failure, /결제 승인 완료|undefined/);
console.log('Footer and payment state checks passed.');
