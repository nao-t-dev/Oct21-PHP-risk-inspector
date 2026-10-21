// @ts-check
/**
 * Suspicious-link rules R1–R8. Pure functions only.
 * Uses globalThis.tldts (vendor/tldts.min.js) for registrable-domain lookups when available.
 *
 * Tuning: change `severity` / `defaultEnabled` / `severityOnRiskyPhp` in RULES below. Nothing else needs editing.
 * `severityOnRiskyPhp` overrides `severity` when the page itself reports an unpatched or EOL PHP
 * (a likely tampering target), so that the same link is judged by its context.
 */
(function (root) {
  /** @type {any} */
  const PAG = (root.PAG = root.PAG || {});

  /** @type {Record<PagRuleId, PagRule>} */
  const RULES = {
    R1: { id: 'R1', severity: 'high', defaultEnabled: true }, // IP address host
    R2: { id: 'R2', severity: 'high', defaultEnabled: true }, // Text / destination mismatch
    R3a: { id: 'R3a', severity: 'high', defaultEnabled: true }, // data: / vbscript:
    R3b: { id: 'R3b', severity: 'medium', defaultEnabled: false }, // javascript: (common for modals)
    R4: { id: 'R4', severity: 'high', defaultEnabled: true }, // user@host spoofing
    R5: { id: 'R5', severity: 'medium', defaultEnabled: true }, // Punycode host
    // External domain: low, but caution on risky-PHP pages, where injected links would point elsewhere.
    R6: { id: 'R6', severity: 'low', severityOnRiskyPhp: 'caution', defaultEnabled: true },
    // URL shortener: common on SNS (often added automatically), so caution, but high on pages running risky PHP.
    R7: { id: 'R7', severity: 'caution', severityOnRiskyPhp: 'high', defaultEnabled: true },
    R8: { id: 'R8', severity: 'medium', defaultEnabled: true }, // HTTPS -> HTTP downgrade
  };
  PAG.RULES = RULES;
  PAG.RULE_IDS = /** @type {PagRuleId[]} */ (Object.keys(RULES));

  const SEVERITY_RANK = { high: 4, medium: 3, caution: 2, low: 1 };

  PAG.SHORTENERS = [
    'bit.ly', 'bitly.com', 't.co', 'tinyurl.com', 'goo.gl', 'ow.ly', 'is.gd', 'buff.ly',
    'rebrand.ly', 'cutt.ly', 'shorturl.at', 'tiny.cc', 'rb.gy', 'x.gd', 't.ly', 's.id',
    'v.gd', 'lnkd.in', 'shorte.st', 'adf.ly', 'qr.ae', 'tr.im', 'bl.ink', 'short.io',
  ];

  const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

  /** @param {string} hostname */
  function isIpHost(hostname) {
    return IPV4.test(hostname) || hostname.startsWith('[');
  }

  /**
   * eTLD+1 ("www.example.co.jp" -> "example.co.jp"). Falls back to the hostname
   * for IPs, localhost and anything tldts cannot resolve.
   * @param {string} hostname
   */
  function registrableDomain(hostname) {
    const host = hostname.toLowerCase().replace(/\.$/, '');
    if (!host || isIpHost(host)) return host;
    const tldts = /** @type {any} */ (root).tldts;
    if (tldts) return tldts.getDomain(host) || host;
    const parts = host.split('.');
    return parts.slice(-2).join('.');
  }

  /**
   * Extract a hostname from link text that *looks like* a URL or bare domain.
   * Returns null when the text is ordinary prose.
   * @param {string} text
   */
  function hostFromText(text) {
    const t = text.trim().replace(/\s+/g, ' ');
    if (!t || t.length > 2048) return null;

    // Explicit URL anywhere in the text: "公式: https://example.com/".
    const urlMatch = /\bhttps?:\/\/[^\s<>"'）)]+/i.exec(t);
    // Otherwise, the whole text must be a domain (optionally with path): "example.com/login".
    const bare =
      /^(?:www\.)?(?:[\p{L}\p{N}-]+\.)+[\p{L}]{2,63}(?:[/:?#]\S*)?$/u.test(t) && !t.includes(' ')
        ? t
        : null;
    const candidate = urlMatch ? urlMatch[0] : bare && `http://${bare}`;
    if (!candidate) return null;
    try {
      const host = new URL(candidate).hostname;
      // Ignore file names like "report.pdf": only accept hosts tldts knows a public suffix for.
      const tldts = /** @type {any} */ (root).tldts;
      if (!urlMatch && tldts) {
        const info = tldts.parse(host);
        if (!info.domain || !info.isIcann) return null;
      }
      return host;
    } catch {
      return null;
    }
  }

  /**
   * @param {string} hostname
   */
  function isShortener(hostname) {
    const host = hostname.toLowerCase();
    return PAG.SHORTENERS.some((/** @type {string} */ d) => host === d || host.endsWith(`.${d}`));
  }

  /**
   * Severity of a rule in the given page context.
   * @param {PagRuleId} id
   * @param {PagLinkContext} [context]
   * @returns {PagSeverity}
   */
  function ruleSeverity(id, context) {
    const rule = RULES[id];
    return context?.riskyPhp && rule.severityOnRiskyPhp ? rule.severityOnRiskyPhp : rule.severity;
  }

  /**
   * Analyse one link.
   * @param {{href: string, text: string, pageUrl: string}} link  href must be absolute (anchor.href).
   * @param {Partial<Record<PagRuleId, boolean>>} [enabled] rule toggles; defaults from RULES.
   * @param {PagLinkContext} [context] page context, e.g. whether the page reports risky PHP.
   * @returns {PagLinkResult | null} null when no enabled rule matches.
   */
  function analyzeLink(link, enabled, context) {
    const on = (/** @type {PagRuleId} */ id) => (enabled && id in enabled ? !!enabled[id] : RULES[id].defaultEnabled);

    /** @type {URL} */
    let url;
    /** @type {URL} */
    let page;
    try {
      url = new URL(link.href);
      page = new URL(link.pageUrl);
    } catch {
      return null;
    }

    /** @type {PagRuleId[]} */
    const matches = [];
    const scheme = url.protocol;

    if (scheme === 'javascript:') {
      if (on('R3b')) matches.push('R3b');
    } else if (scheme === 'data:' || scheme === 'vbscript:') {
      if (on('R3a')) matches.push('R3a');
    } else if (scheme === 'http:' || scheme === 'https:') {
      const host = url.hostname.toLowerCase();
      const pageHost = page.hostname.toLowerCase();
      const linkDomain = registrableDomain(host);
      const pageDomain = registrableDomain(pageHost);
      const external = linkDomain !== pageDomain;

      if (on('R1') && isIpHost(host) && host !== pageHost) matches.push('R1');

      const shortener = isShortener(host);

      // Shortened links never show their real destination, so a text/destination mismatch is expected
      // (SNS rewrite pasted URLs to their own shortener). R7 judges these links instead of R2.
      if (on('R2') && !shortener) {
        const textHost = hostFromText(link.text);
        if (textHost && registrableDomain(textHost) !== linkDomain) matches.push('R2');
      }

      if (on('R4') && (url.username || url.password)) matches.push('R4');

      if (on('R5') && external && host.split('.').some((l) => l.startsWith('xn--'))) matches.push('R5');

      if (on('R6') && external) matches.push('R6');

      if (on('R7') && shortener) matches.push('R7');

      if (on('R8') && page.protocol === 'https:' && scheme === 'http:' && host !== 'localhost' && host !== '127.0.0.1') {
        matches.push('R8');
      }
    } else {
      return null; // mailto:, tel:, custom app schemes, etc.
    }

    if (matches.length === 0) return null;
    const severity = matches
      .map((id) => ruleSeverity(id, context))
      .reduce((a, b) => (SEVERITY_RANK[b] > SEVERITY_RANK[a] ? b : a));
    return { severity, matches };
  }

  Object.assign(PAG, { analyzeLink, ruleSeverity, registrableDomain, hostFromText, isIpHost, isShortener });
})(globalThis);
