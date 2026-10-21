import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PAG } from './setup.js';

const state = (version) => PAG.evaluate({ detected: true, version }).state;

test('parseVersion handles plain, prerelease and distro versions', () => {
  assert.deepEqual(
    { ...PAG.parseVersion('8.3.10'), raw: undefined },
    { raw: undefined, major: 8, minor: 3, patch: 10, suffix: '', prerelease: false, distro: false },
  );
  assert.equal(PAG.parseVersion('8.6.0RC3').prerelease, true);
  assert.equal(PAG.parseVersion('8.4.0-dev').prerelease, true);
  assert.equal(PAG.parseVersion('8.2.20-1+deb12u5').distro, true);
  assert.equal(PAG.parseVersion('8.3').patch, null);
  assert.equal(PAG.parseVersion('garbage'), null);
  assert.equal(PAG.parseVersion(null), null);
});

test('versions before the fixed release are VULNERABLE', () => {
  assert.equal(state('8.5.11'), 'VULNERABLE');
  assert.equal(state('8.4.26'), 'VULNERABLE');
  assert.equal(state('8.3.0'), 'VULNERABLE');
  assert.equal(state('8.2.34'), 'VULNERABLE');
});

test('fixed releases and later are PATCHED', () => {
  assert.equal(state('8.5.12'), 'PATCHED');
  assert.equal(state('8.4.27'), 'PATCHED');
  assert.equal(state('8.3.40'), 'PATCHED');
  assert.equal(state('8.2.35'), 'PATCHED');
  assert.equal(state('8.6.0'), 'PATCHED'); // Newer stable branch.
  assert.equal(state('9.0.1'), 'PATCHED');
});

test('8.1 and older are EOL (shown red)', () => {
  assert.equal(state('8.1.31'), 'EOL');
  assert.equal(state('7.4.33'), 'EOL');
  assert.equal(state('5.6.40'), 'EOL');
  assert.equal(PAG.STATE_LEVEL.EOL, 'danger');
});

test('prerelease and incomplete versions', () => {
  assert.equal(state('8.6.0RC3'), 'PRERELEASE');
  assert.equal(state('8.3'), 'UNKNOWN');
  assert.equal(state(null), 'UNKNOWN');
  assert.equal(PAG.evaluate({ detected: false, version: null }).state, 'NOT_DETECTED');
});

test('distro builds are evaluated by number but flagged', () => {
  const r = PAG.evaluate({ detected: true, version: '8.2.20-1+deb12u5' });
  assert.equal(r.state, 'VULNERABLE');
  assert.equal(r.distro, true);
  assert.deepEqual(r.advisories, ['php-2026-10-21']);
});

test('worst state wins across multiple advisories', () => {
  const extra = { id: 'future', fixed: { '8.4': '8.4.30' } };
  const r = PAG.evaluate({ detected: true, version: '8.4.28' }, [...PAG.ADVISORIES, extra]);
  assert.equal(r.state, 'VULNERABLE');
  assert.deepEqual(r.advisories, ['future']);
});
