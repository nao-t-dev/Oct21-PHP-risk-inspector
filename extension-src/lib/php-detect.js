// @ts-check
/**
 * Passive PHP detection from response headers and the URL. Pure functions only.
 */
(function (root) {
  /** @type {any} */
  const PAG = (root.PAG = root.PAG || {});

  const PHP_TOKEN = /\bPHP(?:\/([0-9][^\s;,()]*))?/i;

  /**
   * @param {{name: string, value?: string}[] | undefined} headers
   * @param {string} url
   * @returns {PagDetection}
   */
  function detectPhp(headers, url) {
    /** @type {PagEvidence[]} */
    const evidence = [];
    /** @type {string | null} */
    let version = null;

    for (const h of headers || []) {
      const name = h.name.toLowerCase();
      const value = h.value || '';

      if (name === 'x-powered-by' || name === 'server') {
        const m = PHP_TOKEN.exec(value);
        // "Server: Apache" must not match, but "X-Powered-By: PHP" (no version) should.
        if (m && (m[1] || name === 'x-powered-by')) {
          evidence.push({ source: name, value });
          if (m[1] && !version) version = m[1];
        }
      } else if (name === 'set-cookie' && /(^|\n)\s*PHPSESSID=/i.test(value)) {
        evidence.push({ source: 'set-cookie', value: 'PHPSESSID' });
      }
    }

    try {
      const { pathname } = new URL(url);
      if (/\.php(\/|$)/i.test(pathname)) evidence.push({ source: 'url', value: pathname });
    } catch {
      // Ignore unparsable URLs.
    }

    return { detected: evidence.length > 0, version, evidence };
  }

  PAG.detectPhp = detectPhp;
})(globalThis);
