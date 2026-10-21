// @ts-check
/**
 * Content script entry point. Loaded last (see manifest.json content_scripts order).
 */
(async function () {
  const PAG = /** @type {any} */ (globalThis).PAG;
  const hostname = location.hostname;

  /** @type {PagTabStatus} */
  const fallbackStatus = {
    state: 'NOT_DETECTED',
    version: null,
    advisories: [],
    distro: false,
    url: location.origin,
    evidence: [],
    checkedAt: Date.now(),
  };
  /** @type {PagTabStatus | null} null until the service worker has provided a status */
  let status = null;
  /** @type {PagSettings | null} */
  let settings = null;
  let badgeDismissedForPage = false;

  /** @param {PagTabStatus | null | undefined} s */
  const sameOrigin = (s) => {
    try {
      return !!s && new URL(s.url).origin === location.origin;
    } catch {
      return false;
    }
  };

  // Registered before any await so a status pushed by the service worker is never missed.
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === 'status') {
      // Late status for the race where getStatus was answered before the headers were processed.
      if (!status && sameOrigin(msg.status)) {
        status = msg.status;
        apply();
      }
      return false;
    }
    if (msg?.type === 'getPageInfo') {
      sendResponse({ hostname, stats: PAG.Highlighter.getStats() });
    }
    return false;
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.settings) {
      settings = PAG.mergeSettings(changes.settings.newValue);
      apply();
    }
  });

  async function hideBadgeForSite() {
    const fresh = await PAG.loadSettings();
    if (!PAG.hostInList(hostname, fresh.badgeHiddenSites)) {
      fresh.badgeHiddenSites.push(hostname);
      await PAG.saveSettings(fresh); // storage.onChanged re-applies.
    }
  }

  function apply() {
    if (!settings) return; // Not initialised yet.
    PAG.Highlighter.stop();
    PAG.Badge.unmountAll();
    if (PAG.hostInList(hostname, settings.excludedSites)) return;

    const current = status || fallbackStatus;
    const level = PAG.STATE_LEVEL[current.state];
    const phpWarning = level === 'danger' || level === 'warning';
    const highlight = settings.highlightLinks && (settings.highlightScope === 'all' || phpWarning);
    const showBadge =
      settings.showBadge &&
      !badgeDismissedForPage &&
      !PAG.hostInList(hostname, settings.badgeHiddenSites) &&
      (current.state !== 'NOT_DETECTED' || settings.showNotDetectedBadge);

    if (showBadge) {
      PAG.Badge.mountBadge(
        current,
        {
          onHidePage: () => {
            badgeDismissedForPage = true;
            PAG.Badge.unmountBadge();
          },
          onHideSite: hideBadgeForSite,
        },
        highlight,
      );
    }
    if (highlight) {
      PAG.Highlighter.start(settings.rules, PAG.Badge.setStats, { riskyPhp: level === 'danger' });
    }
  }

  settings = await PAG.loadSettings();
  /** @type {PagTabStatus | null} */
  const answered = await chrome.runtime.sendMessage({ type: 'getStatus' }).catch(() => null);
  if (!status && sameOrigin(answered)) status = answered;
  apply();
})();
