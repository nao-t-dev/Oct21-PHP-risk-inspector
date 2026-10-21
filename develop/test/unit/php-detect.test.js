import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PAG } from './setup.js';

const detect = (headers, url = 'https://example.com/') =>
  PAG.detectPhp(Object.entries(headers).map(([name, value]) => ({ name, value })), url);

test('X-Powered-By with version', () => {
  const r = detect({ 'X-Powered-By': 'PHP/8.3.10' });
  assert.equal(r.detected, true);
  assert.equal(r.version, '8.3.10');
  assert.equal(r.evidence[0].source, 'x-powered-by');
});

test('X-Powered-By without version still detects PHP', () => {
  const r = detect({ 'x-powered-by': 'PHP' });
  assert.equal(r.detected, true);
  assert.equal(r.version, null);
});

test('Server header with PHP token', () => {
  const r = detect({ Server: 'Apache/2.4.62 (Debian) PHP/8.2.20-1+deb12u5' });
  assert.equal(r.version, '8.2.20-1+deb12u5');
});

test('Server header without PHP is ignored', () => {
  assert.equal(detect({ Server: 'nginx/1.27.0' }).detected, false);
  assert.equal(detect({ Server: 'Apache' }).detected, false);
});

test('non-PHP X-Powered-By is ignored', () => {
  assert.equal(detect({ 'X-Powered-By': 'Express' }).detected, false);
  assert.equal(detect({ 'X-Powered-By': 'ASP.NET' }).detected, false);
});

test('PHPSESSID cookie and .php URL are version-less signals', () => {
  const c = detect({ 'Set-Cookie': 'PHPSESSID=abc123; path=/; HttpOnly' });
  assert.equal(c.detected, true);
  assert.equal(c.version, null);
  assert.equal(c.evidence[0].value, 'PHPSESSID'); // Cookie value is never stored.

  assert.equal(detect({}, 'https://example.com/index.php?x=1').detected, true);
  assert.equal(detect({}, 'https://example.com/index.php/path/info').detected, true);
  assert.equal(detect({}, 'https://example.com/phpinfo-guide').detected, false);
});
