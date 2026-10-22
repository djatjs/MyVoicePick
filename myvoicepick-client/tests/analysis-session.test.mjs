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
