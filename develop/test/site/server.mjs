// Local test server. Returns PHP-like headers without installing PHP.
// Usage: npm run serve  ->  http://localhost:8787/
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.PORT) || 8787;
const dir = fileURLToPath(new URL('.', import.meta.url));

const SCENARIOS = [
  ['/php/8.3.10', 'X-Powered-By: PHP/8.3.10 → 未修正の可能性（赤）'],
  ['/php/8.4.27', 'X-Powered-By: PHP/8.4.27 → 修正版以降のバージョン（緑）'],
  ['/php/7.4.33', 'X-Powered-By: PHP/7.4.33 → サポート終了（赤）'],
  ['/php/8.6.0RC3', 'X-Powered-By: PHP/8.6.0RC3 → 開発版（黄）'],
  ['/server/8.2.20-1+deb12u5', 'Server: Apache PHP/8.2.20-1+deb12u5 → 未修正の可能性 + ディストリ注記'],
  ['/cookie', 'Set-Cookie: PHPSESSID → バージョン不明（黄）'],
  ['/index.php', 'URL が .php → バージョン不明（黄）'],
  ['/plain', 'PHP非公開、または未使用 → グレー + 黄色の点'],
];

function indexPage() {
  const items = SCENARIOS.map(([href, label]) => `<li><a href="${href}">${label}</a></li>`).join('\n');
  return `<!doctype html><meta charset="utf-8"><title>Oct21 PHP Risk Inspector test</title>
<h1>Oct21 PHP Risk Inspector — テストシナリオ</h1>
<p>各ページの下部には怪しいリンクのサンプル（links.html と同じ内容）が入っています。</p>
<ul>${items}</ul>`;
}

const links = readFileSync(`${dir}links.html`, 'utf8');

createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const p = decodeURIComponent(url.pathname);
  /** @type {Record<string, string>} */
  const headers = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' };

  if (p === '/') {
    res.writeHead(200, headers).end(indexPage());
    return;
  }
  if (p.startsWith('/php/')) headers['X-Powered-By'] = `PHP/${p.slice(5)}`;
  else if (p.startsWith('/server/')) headers.Server = `Apache/2.4.62 (Debian) PHP/${p.slice(8)}`;
  else if (p === '/cookie') headers['Set-Cookie'] = 'PHPSESSID=test123; path=/; HttpOnly';
  else if (!['/index.php', '/plain', '/links.html'].includes(p)) {
    res.writeHead(404, headers).end('not found');
    return;
  }
  res.writeHead(200, headers).end(links);
}).listen(PORT, () => console.log(`Test server: http://localhost:${PORT}/`));
