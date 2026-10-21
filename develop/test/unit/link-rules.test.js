import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PAG } from './setup.js';

const PAGE = 'https://www.example.co.jp/news/';
const check = (href, text = 'link', enabled, context) =>
  PAG.analyzeLink({ href: new URL(href, PAGE).href, text, pageUrl: PAGE }, enabled, context);
const RISKY = { riskyPhp: true };
const SAFE = { riskyPhp: false };

test('same-site links are not flagged', () => {
  assert.equal(check('/about'), null);
  assert.equal(check('https://shop.example.co.jp/'), null);
  assert.equal(check('mailto:info@example.co.jp'), null);
  assert.equal(check('tel:0312345678'), null);
});

test('R6 external domain alone is low severity', () => {
  assert.deepEqual(check('https://other.example/'), { severity: 'low', matches: ['R6'] });
});

test('R1 IP address hosts, including integer notation', () => {
  assert.equal(check('http://192.168.0.1/login').severity, 'high');
  assert.ok(check('http://3232235521/').matches.includes('R1')); // = 192.168.0.1
  assert.ok(check('http://0xC0A80001/').matches.includes('R1'));
  assert.ok(check('http://[2001:db8::1]/').matches.includes('R1'));
});

test('R2 link text shows a different domain', () => {
  const r = check('https://evil.example/login', 'paypal.com');
  assert.ok(r.matches.includes('R2'));
  assert.equal(r.severity, 'high'); // External + R2 -> normal (high) highlight.
  assert.ok(check('https://evil.example/', 'https://www.paypal.com/signin').matches.includes('R2'));
  assert.ok(check('https://evil.example/', '公式サイト https://paypal.com/ はこちら').matches.includes('R2'));
});

test('R2 does not fire for matching or non-domain text', () => {
  assert.ok(!check('https://www.paypal.com/', 'paypal.com')?.matches.includes('R2'));
  assert.ok(!check('https://other.example/', 'Click here')?.matches.includes('R2'));
  assert.ok(!check('https://other.example/', 'report.pdf')?.matches.includes('R2'));
  assert.ok(!check('https://other.example/', 'v1.2.3')?.matches.includes('R2'));
});

test('R3a data:/vbscript: are high; R3b javascript: is off by default', () => {
  assert.deepEqual(check('data:text/html,<script>alert(1)</script>'), { severity: 'high', matches: ['R3a'] });
  assert.equal(check('vbscript:msgbox(1)').severity, 'high');
  assert.equal(check('javascript:void(0)'), null);
  assert.deepEqual(check('javascript:void(0)', 'x', { R3b: true }), { severity: 'medium', matches: ['R3b'] });
});

test('R4 user-info spoofing', () => {
  const r = check('https://www.example.co.jp@evil.example/');
  assert.ok(r.matches.includes('R4'));
  assert.equal(r.severity, 'high');
});

test('R5 punycode on external domains only', () => {
  assert.ok(check('https://xn--pple-43d.com/').matches.includes('R5'));
  assert.ok(check('https://аpple.com/').matches.includes('R5')); // Cyrillic "а" is converted to punycode.
  assert.equal(check('https://xn--pple-43d.com/').severity, 'medium');
});

test('R7 URL shorteners are caution (yellow) unless the page reports risky PHP', () => {
  assert.deepEqual(check('https://bit.ly/abc'), { severity: 'caution', matches: ['R6', 'R7'] });
  assert.deepEqual(check('https://bit.ly/abc', 'link', undefined, SAFE), { severity: 'caution', matches: ['R6', 'R7'] });
  assert.deepEqual(check('https://t.co/xyz'), { severity: 'caution', matches: ['R6', 'R7'] });
  // Pages running an unpatched / EOL PHP: shortened links become high.
  assert.deepEqual(check('https://bit.ly/abc', 'link', undefined, RISKY), { severity: 'high', matches: ['R6', 'R7'] });
  // A stronger rule still wins: shortener over plain HTTP from an HTTPS page -> medium (R8).
  assert.equal(check('http://bit.ly/abc').severity, 'medium');
});

test('R8 HTTPS -> HTTP downgrade', () => {
  assert.ok(check('http://other.example/').matches.includes('R8'));
  assert.ok(check('http://www.example.co.jp/').matches.includes('R8'));
  assert.equal(PAG.analyzeLink({ href: 'http://other.example/', text: '', pageUrl: 'http://x.test/' }).matches.includes('R8'), false);
});

test('disabled rules are skipped', () => {
  assert.equal(check('https://other.example/', 'x', { R6: false }), null);
  assert.equal(check('https://bit.ly/abc', 'x', { R6: false, R7: false }), null);
});

test('registrableDomain uses the public suffix list', () => {
  assert.equal(PAG.registrableDomain('www.example.co.jp'), 'example.co.jp');
  assert.equal(PAG.registrableDomain('a.b.example.com'), 'example.com');
  assert.equal(PAG.registrableDomain('192.168.0.1'), '192.168.0.1');
  assert.equal(PAG.registrableDomain('localhost'), 'localhost');
});

test('settings merge keeps new defaults and hostInList matches subdomains', () => {
  const s = PAG.mergeSettings({ rules: { R6: false } });
  assert.equal(s.rules.R6, false);
  assert.equal(s.rules.R1, true);
  assert.equal(s.rules.R3b, false);
  assert.equal(PAG.hostInList('www.example.com', ['example.com']), true);
  assert.equal(PAG.hostInList('badexample.com', ['example.com']), false);
});

test('shortened links skip R2: SNS auto-shortening is not flagged high', () => {
  const sns = (pageUrl, href, text, context) => PAG.analyzeLink({ href, text, pageUrl }, undefined, context);
  // X rewrites pasted URLs to t.co but shows the original URL as link text.
  assert.deepEqual(sns('https://x.com/someone/status/1', 'https://t.co/AbC123', 'example.com/news/2026/10…'), {
    severity: 'caution',
    matches: ['R6', 'R7'],
  });
  assert.deepEqual(sns('https://www.linkedin.com/feed/', 'https://lnkd.in/xyz', 'https://example.com/blog'), {
    severity: 'caution',
    matches: ['R6', 'R7'],
  });
  // A shortener disguised as another domain: caution on ordinary pages, high on risky-PHP pages.
  assert.equal(check('https://bit.ly/abc', 'paypal.com', undefined, SAFE).severity, 'caution');
  assert.equal(check('https://bit.ly/abc', 'paypal.com', undefined, RISKY).severity, 'high');
  // Non-shortener mismatches are still high everywhere.
  assert.equal(check('https://evil.example/', 'paypal.com', undefined, SAFE).severity, 'high');
});

test('risky-PHP context escalates only rules that define severityOnRiskyPhp (R6, R7)', () => {
  assert.equal(check('https://other.example/', 'x', undefined, RISKY).severity, 'caution'); // R6 low -> caution
  assert.equal(check('https://other.example/', 'x', undefined, SAFE).severity, 'low');
  assert.equal(check('https://xn--pple-43d.example/', 'x', undefined, RISKY).severity, 'medium'); // R5 unchanged
  assert.equal(PAG.ruleSeverity('R7'), 'caution');
  assert.equal(PAG.ruleSeverity('R7', RISKY), 'high');
  assert.equal(PAG.ruleSeverity('R1', RISKY), 'high');
});
