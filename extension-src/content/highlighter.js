// @ts-check
/**
 * Scans <a href> elements, marks suspicious ones with data-pag-risk / data-pag-rules
 * (styled by content/highlight.css) and keeps up with DOM changes.
 * Work is chunked with requestIdleCallback so large pages stay responsive.
 */
(function (root) {
  /** @type {any} */
  const PAG = (root.PAG = root.PAG || {});

  const ATTR_RISK = 'data-pag-risk';
  const ATTR_RULES = 'data-pag-rules';

  /** @type {Set<HTMLAnchorElement>} */
  const queue = new Set();
  /** @type {WeakMap<HTMLAnchorElement, string>} href+text last analysed, to skip unchanged links */
  let seen = new WeakMap();
  /** @type {MutationObserver | null} */
  let observer = null;
  /** @type {Partial<Record<PagRuleId, boolean>>} */
  let rules = {};
  /** @type {PagLinkContext} */
  let context = { riskyPhp: false };
  /** @type {(stats: PagStats) => void} */
  let onStats = () => {};
  let scheduled = false;
  let running = false;
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let statsTimer;

  const idle =
    typeof requestIdleCallback === 'function'
      ? requestIdleCallback
      : (/** @type {IdleRequestCallback} */ cb) =>
          setTimeout(() => cb({ didTimeout: true, timeRemaining: () => 8 }), 16);

  /** @param {Node} node */
  function enqueueTree(node) {
    if (node instanceof HTMLAnchorElement) queue.add(node);
    if (node instanceof Element || node instanceof DocumentFragment) {
      for (const a of node.querySelectorAll('a[href]')) {
        if (a instanceof HTMLAnchorElement) queue.add(a);
      }
    }
    schedule();
  }

  function schedule() {
    if (scheduled || !running) return;
    scheduled = true;
    idle(work, { timeout: 1000 });
  }

  /** @param {IdleDeadline} deadline */
  function work(deadline) {
    scheduled = false;
    if (!running) return;
    let changed = false;
    for (const a of queue) {
      queue.delete(a);
      if (process(a)) changed = true;
      if (deadline.timeRemaining() < 2 && !deadline.didTimeout) break;
    }
    if (changed) emitStats();
    if (queue.size > 0) schedule();
  }

  /**
   * @param {HTMLAnchorElement} a
   * @returns {boolean} whether the marking changed
   */
  function process(a) {
    if (!a.isConnected) return false;
    const raw = a.getAttribute('href') || '';
    const text = a.textContent || '';
    const sig = `${a.href}\n${text}`;
    if (seen.get(a) === sig) return false;
    seen.set(a, sig);

    const before = a.getAttribute(ATTR_RULES);
    const result =
      raw === '' || raw.startsWith('#') ? null : PAG.analyzeLink({ href: a.href, text, pageUrl: location.href }, rules, context);
    if (result) {
      a.setAttribute(ATTR_RISK, result.severity);
      a.setAttribute(ATTR_RULES, result.matches.join(' '));
    } else {
      a.removeAttribute(ATTR_RISK);
      a.removeAttribute(ATTR_RULES);
    }
    return before !== a.getAttribute(ATTR_RULES);
  }

  /** @returns {PagStats} */
  function getStats() {
    /** @type {PagStats} */
    const s = { total: 0, high: 0, medium: 0, caution: 0, low: 0, byRule: {} };
    for (const a of document.querySelectorAll(`a[${ATTR_RISK}]`)) {
      const sev = /** @type {PagSeverity} */ (a.getAttribute(ATTR_RISK));
      s.total++;
      s[sev]++;
      for (const id of /** @type {PagRuleId[]} */ ((a.getAttribute(ATTR_RULES) || '').split(' '))) {
        s.byRule[id] = (s.byRule[id] || 0) + 1;
      }
    }
    return s;
  }

  function emitStats() {
    clearTimeout(statsTimer);
    statsTimer = setTimeout(() => onStats(getStats()), 300);
  }

  /** @param {Event} e */
  function onPointer(e) {
    const target = e.target instanceof Element ? e.target.closest(`a[${ATTR_RISK}]`) : null;
    if (target instanceof HTMLAnchorElement) {
      const ids = /** @type {PagRuleId[]} */ ((target.getAttribute(ATTR_RULES) || '').split(' '));
      PAG.Badge.showTooltip(target, ids);
    } else {
      PAG.Badge.hideTooltip();
    }
  }

  /**
   * @param {Partial<Record<PagRuleId, boolean>>} ruleToggles
   * @param {(stats: PagStats) => void} statsCallback
   * @param {PagLinkContext} pageContext
   */
  function start(ruleToggles, statsCallback, pageContext) {
    stop();
    running = true;
    rules = ruleToggles;
    context = pageContext;
    onStats = statsCallback;
    observer = new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === 'attributes' && r.target instanceof HTMLAnchorElement) queue.add(r.target);
        for (const n of r.addedNodes) enqueueTree(n);
      }
      schedule();
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['href'],
    });
    document.addEventListener('mouseover', onPointer, true);
    document.addEventListener('focusin', onPointer, true);
    document.addEventListener('scroll', PAG.Badge.hideTooltip, { capture: true, passive: true });
    enqueueTree(document.documentElement);
    emitStats();
  }

  function stop() {
    running = false;
    observer?.disconnect();
    observer = null;
    queue.clear();
    seen = new WeakMap();
    clearTimeout(statsTimer);
    document.removeEventListener('mouseover', onPointer, true);
    document.removeEventListener('focusin', onPointer, true);
    document.removeEventListener('scroll', PAG.Badge.hideTooltip, true);
    PAG.Badge.hideTooltip();
    for (const a of document.querySelectorAll(`a[${ATTR_RISK}]`)) {
      a.removeAttribute(ATTR_RISK);
      a.removeAttribute(ATTR_RULES);
    }
  }

  PAG.Highlighter = { start, stop, getStats };
})(globalThis);
