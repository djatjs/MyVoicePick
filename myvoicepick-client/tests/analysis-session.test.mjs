import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import ts from 'typescript';
const load = createRequire(import.meta.url);
load.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, filename);
};
const { verifyAnalysisSession, loginDestination } = load('../lib/analysis-session.ts');
assert.equal(await verifyAnalysisSession(null, () => { throw Error('must not request'); }), 'anonymous');
assert.equal(await verifyAnalysisSession('token', async () => new Response(null, { status: 200 })), 'authenticated');
assert.equal(await verifyAnalysisSession('expired', async () => new Response(null, { status: 401 })), 'anonymous');
assert.equal(await verifyAnalysisSession('token', async () => new Response(null, { status: 500 })), 'error');
assert.equal(await verifyAnalysisSession('token', async () => { throw Error('offline'); }), 'error');
assert.equal(loginDestination('/analyze'), '/analyze');
assert.equal(loginDestination('/pricing'), '/pricing');
assert.equal(loginDestination('https://example.com'), '/mypage');
assert.equal(loginDestination('//example.com'), '/mypage');
assert.equal(loginDestination(null), '/mypage');
console.log('Session verification and safe login return checks passed.');

const { paymentConfirmation } = load('../lib/payment-confirmation.ts');
assert.deepEqual(paymentConfirmation('test-key', 'test-order', '100', 'PRO'), { paymentKey: 'test-key', orderId: 'test-order', amount: 100, plan: 'PRO' });
for (const amount of [null, '', 'NaN', 'Infinity', '-1', '0', '1.5']) {
  assert.equal(paymentConfirmation('test-key', 'test-order', amount, 'PRO'), null);
}
assert.equal(paymentConfirmation(null, 'test-order', '100', 'PRO'), null);
assert.equal(paymentConfirmation('test-key', 'test-order', '100', 'OTHER'), null);
console.log('Payment callback validation checks passed.');

const { subscribeToLogin, hasLoginToken, setLoginToken } = load('../lib/analysis-session.ts');
const events = new EventTarget();
globalThis.window = events;
let savedToken = null;
globalThis.localStorage = { getItem: () => savedToken, setItem: (_key, value) => { savedToken = value; }, removeItem: () => { savedToken = null; } };
assert.equal(hasLoginToken(), false);
savedToken = 'test-token';
assert.equal(hasLoginToken(), true);
let changes = 0;
const unsubscribe = subscribeToLogin(() => changes++);
events.dispatchEvent(new Event('storage'));
assert.equal(changes, 1);
setLoginToken(null);
assert.equal(hasLoginToken(), false);
assert.equal(changes, 2);
setLoginToken('new-token');
assert.equal(hasLoginToken(), true);
assert.equal(changes, 3);
unsubscribe();
events.dispatchEvent(new Event('storage'));
assert.equal(changes, 3);
delete globalThis.window;
delete globalThis.localStorage;
console.log('Login subscription and cleanup checks passed.');

const { readAnalysisPoll } = load('../lib/analysis-session.ts');
const json = (body, status = 200) => new Response(JSON.stringify(body), { status });
assert.equal((await readAnalysisPoll(json({ status: 'COMPLETED', matchedSongTitle: 't' }))).kind, 'completed');
assert.deepEqual(await readAnalysisPoll(json({ status: 'PENDING' })), { kind: 'waiting', queued: true });
assert.deepEqual(await readAnalysisPoll(json({ status: 'PROCESSING' })), { kind: 'waiting', queued: false });
assert.equal((await readAnalysisPoll(json({ status: 'FAILED' }))).kind, 'failed');
assert.equal((await readAnalysisPoll(new Response(null, { status: 401 }))).kind, 'failed');
assert.equal((await readAnalysisPoll(new Response(null, { status: 404 }))).kind, 'failed');
for (const res of [null, new Response(null, { status: 502 }), new Response(null, { status: 504 }), new Response('<html>', { status: 200 })]) {
  assert.deepEqual(await readAnalysisPoll(res), { kind: 'retry' });
}
console.log('Analysis polling keeps waiting through passing errors.');
