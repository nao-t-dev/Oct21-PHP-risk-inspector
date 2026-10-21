// @ts-check
/**
 * Floating badge, detail panel and link tooltip, rendered in a closed Shadow DOM
 * so page CSS cannot affect them (and vice versa).
 */
(function (root) {
  /** @type {any} */
  const PAG = (root.PAG = root.PAG || {});
  const { h, t } = PAG;

  /** @type {HTMLElement | null} */
  let host = null;
  /** @type {HTMLElement | null} */
  let layer = null;
  /** @type {{badge: HTMLElement, panel: HTMLElement, count: HTMLElement, stats: HTMLElement} | null} */
  let badgeEls = null;
  /** @type {HTMLElement | null} */
  let tooltip = null;

  /** @returns {HTMLElement} */
  function ensureLayer() {
    if (layer && host?.isConnected) return layer;
    host = document.createElement('oct21-php-risk-inspector');
    host.setAttribute(
      'style',
      'all: initial !important; position: fixed !important; top: 0 !important; left: 0 !important; ' +
        'width: 0 !important; height: 0 !important; z-index: 2147483647 !important;',
    );
    const shadow = host.attachShadow({ mode: 'closed' });
    const style = document.createElement('style');
    style.textContent = PAG.UI_CSS;
    const fresh = h('div', { class: 'layer' });
    shadow.append(style, fresh);
    document.documentElement.append(host);
    layer = fresh;
    return fresh;
  }

  /** @param {PagStats} stats */
  function renderStats(stats) {
    if (stats.total === 0) return [h('p', { class: 'note' }, [t('panel_no_suspicious_links')])];
    return [
      h('div', { class: 'counts' }, [
        h('span', { class: 'chip', 'data-sev': 'high' }, [t('severity_high_count', String(stats.high))]),
        h('span', { class: 'chip', 'data-sev': 'medium' }, [t('severity_medium_count', String(stats.medium))]),
        h('span', { class: 'chip', 'data-sev': 'caution' }, [t('severity_caution_count', String(stats.caution))]),
        h('span', { class: 'chip', 'data-sev': 'low' }, [t('severity_low_count', String(stats.low))]),
      ]),
    ];
  }

  /**
   * @param {PagTabStatus} status
   * @param {{onHidePage: () => void, onHideSite: () => void}} handlers
   */
  function buildPanel(status, handlers) {
    const advisories = PAG.ADVISORIES.filter((/** @type {PagAdvisory} */ a) => status.advisories.includes(a.id));
    const evidence = status.evidence.map((e) =>
      h('li', null, [t(`evidence_${e.source.replace(/-/g, '_')}`), ': ', h('code', null, [e.value])]),
    );

    const close = h('button', { type: 'button' }, [t('panel_close')]);
    const hidePage = h('button', { type: 'button' }, [t('panel_hide_page')]);
    const hideSite = h('button', { type: 'button' }, [t('panel_hide_site')]);
    hidePage.addEventListener('click', handlers.onHidePage);
    hideSite.addEventListener('click', handlers.onHideSite);

    const stats = h('div');
    const panel = h('div', { class: 'panel', role: 'dialog', 'aria-label': t('extName') }, [
      h('h2', null, [PAG.stateLabel(status.state, status.version)]),
      h('p', null, [t(`state_desc_${status.state}`)]),
      status.distro && h('p', { class: 'note' }, [t('note_distro')]),
      evidence.length > 0 && h('h3', null, [t('panel_evidence')]),
      evidence.length > 0 && h('ul', null, evidence),
      ...advisories.flatMap((/** @type {PagAdvisory} */ a) => [
        h('h3', null, [t('panel_advisory')]),
        h('p', null, [
          h('a', { href: a.url, target: '_blank', rel: 'noopener noreferrer' }, [`${a.published} ${a.title}`]),
          ` (${a.cvss})`,
        ]),
        h('ul', null, a.cves.map((/** @type {PagAdvisory['cves'][number]} */ c) =>
          h('li', null, [h('a', { href: c.url, target: '_blank', rel: 'noopener noreferrer' }, [c.id]), ` — ${c.summary}`]),
        )),
        h('p', { class: 'note' }, [t('panel_fixed_versions', Object.values(a.fixed).join(' / '))]),
      ]),
      h('h3', null, [t('panel_links')]),
      stats,
      h('p', { class: 'note' }, [t('panel_disclaimer')]),
      h('div', { class: 'actions' }, [close, hidePage, hideSite]),
    ]);
    panel.hidden = true;
    return { panel, close, stats };
  }

  /**
   * Show the floating badge.
   * @param {PagTabStatus} status
   * @param {{onHidePage: () => void, onHideSite: () => void}} handlers
   * @param {boolean} linksEnabled whether the link highlighter runs on this page
   */
  function mountBadge(status, handlers, linksEnabled) {
    unmountBadge();
    const l = ensureLayer();
    const level = PAG.STATE_LEVEL[status.state];
    const count = h('span', { class: 'count', title: t('badge_count_title') });
    count.hidden = true;
    const badge = h('button', { class: 'badge', type: 'button', 'data-level': level, 'aria-expanded': 'false' }, [
      h('span', { class: 'dot' }),
      h('span', { class: 'label' }, [PAG.stateLabel(status.state, status.version)]),
      count,
    ]);
    const { panel, close, stats } = buildPanel(status, handlers);
    const toggle = (/** @type {boolean} */ open) => {
      panel.hidden = !open;
      badge.setAttribute('aria-expanded', String(open));
    };
    badge.addEventListener('click', () => toggle(panel.hidden));
    close.addEventListener('click', () => toggle(false));
    l.append(panel, badge);
    badgeEls = { badge, panel, count, stats };
    if (linksEnabled) setStats({ total: 0, high: 0, medium: 0, caution: 0, low: 0, byRule: {} });
    else stats.replaceChildren(h('p', { class: 'note' }, [t('panel_links_disabled')]));
  }

  /** @param {PagStats} s */
  function setStats(s) {
    if (!badgeEls) return;
    const serious = s.high + s.medium;
    badgeEls.count.hidden = serious === 0;
    badgeEls.count.textContent = `⚠ ${serious}`;
    badgeEls.stats.replaceChildren(...renderStats(s));
  }

  function unmountBadge() {
    badgeEls?.badge.remove();
    badgeEls?.panel.remove();
    badgeEls = null;
  }

  /**
   * @param {HTMLAnchorElement} anchor
   * @param {PagRuleId[]} rules
   */
  function showTooltip(anchor, rules) {
    const l = ensureLayer();
    /** @type {HTMLElement} */
    let tip = tooltip || h('div', { class: 'tooltip', role: 'tooltip' });
    if (!tooltip) {
      l.append(tip);
      tooltip = tip;
    }
    tip.replaceChildren(
      h('ul', null, rules.map((id) => h('li', null, [t(`rule_${id}`)]))),
      h('div', null, [t('tooltip_destination'), ' ', h('code', null, [anchor.href.slice(0, 300)])]),
    );
    tip.hidden = false;
    const r = anchor.getBoundingClientRect();
    const tt = tip.getBoundingClientRect();
    const top = r.bottom + 6 + tt.height > innerHeight ? r.top - tt.height - 6 : r.bottom + 6;
    const left = Math.min(Math.max(8, r.left), innerWidth - tt.width - 8);
    tip.style.top = `${Math.max(8, top)}px`;
    tip.style.left = `${left}px`;
  }

  function hideTooltip() {
    if (tooltip) tooltip.hidden = true;
  }

  function unmountAll() {
    unmountBadge();
    tooltip = null;
    host?.remove();
    host = null;
    layer = null;
  }

  PAG.Badge = { mountBadge, unmountBadge, setStats, showTooltip, hideTooltip, unmountAll };
})(globalThis);
