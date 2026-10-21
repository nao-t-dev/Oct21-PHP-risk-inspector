// Zips extension-src/ into dist/oct21-php-risk-inspector-<version>.zip for distribution (e.g. Chrome Web Store upload).
// Checks that package.json and manifest.json versions match before zipping.
import { readFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../..', import.meta.url));
const pkg = JSON.parse(readFileSync(`${root}package.json`, 'utf8'));
const manifest = JSON.parse(readFileSync(`${root}extension-src/manifest.json`, 'utf8'));

if (pkg.version !== manifest.version) {
  console.error(`Version mismatch: package.json ${pkg.version} / manifest.json ${manifest.version}`);
  process.exit(1);
}
for (const size of [16, 32, 48, 128]) {
  if (!existsSync(`${root}extension-src/icons/icon${size}.png`)) {
    console.error(`Missing extension-src/icons/icon${size}.png — run "npm run icons".`);
    process.exit(1);
  }
}

const out = `${root}dist/oct21-php-risk-inspector-${manifest.version}.zip`;
mkdirSync(`${root}dist`, { recursive: true });
rmSync(out, { force: true });
execFileSync('zip', ['-r', '-X', '-q', out, '.', '-x', '.*', '*/.*'], { cwd: `${root}extension-src`, stdio: 'inherit' });
console.log(`Created ${out}`);
