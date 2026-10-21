// @ts-check
/**
 * Observes top-level document response headers (read-only, non-blocking),
 * evaluates PHP status and stores it per tab in chrome.storage.session.
 * The service worker can be stopped at any time, so no state is kept in memory.
 */
importScripts('../lib/advisories.js', '../lib/version.js', '../lib/php-detect.js');

const ACTION_BADGE = {
  danger: { text: '!', color: '#d93025' },
  warning: { text: '?', color: '#f9ab00' },
  ok: { text: '✓', color: '#188038' },
  none: { text: '', color: '#5f6368' },
};

/** @param {number} tabId */
const tabKey = (tabId) => `tab:${tabId}`;

/**
 * @param {number} tabId
 * @param {PagState} state
 */
async function updateActionBadge(tabId, state) {
  const b = ACTION_BADGE[/** @type {PagLevel} */ (PAG.STATE_LEVEL[state])];
  try {
    await chrome.action.setBadgeText({ tabId, text: b.text });
    await chrome.action.setBadgeBackgroundColor({ tabId, color: b.color });
  } catch {
    // The tab may already be gone.
  }
}

chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    if (details.tabId < 0) return; // Prerender / service worker requests.
    const detection = PAG.detectPhp(details.responseHeaders, details.url);
    /** @type {PagTabStatus} */
    const status = {
      ...PAG.evaluate(detection),
      url: new URL(details.url).origin, // Origin only: the full URL (path, query) is not needed or kept.
      evidence: detection.evidence,
      checkedAt: Date.now(),
    };
    const tabId = details.tabId;
    chrome.storage.session.set({ [tabKey(tabId)]: status }).then(() => {
      // Covers the race where the content script asked before this event was handled
      // (e.g. right after the service worker started). Fails silently if no script is listening yet.
      chrome.tabs.sendMessage(tabId, { type: 'status', status }, { frameId: 0 }).catch(() => {});
    });
    updateActionBadge(tabId, status.state);
  },
  { urls: ['http://*/*', 'https://*/*'], types: ['main_frame'] },
  // extraHeaders is needed to see Set-Cookie (PHPSESSID).
  ['responseHeaders', 'extraHeaders'],
);

chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.session.remove(tabKey(tabId));
});

/**
 * Content scripts cannot read storage.session, so they ask here.
 * The stored entry is only returned when it belongs to the sender's current origin.
 */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type !== 'getStatus' || !sender.tab?.id) return false;
  const tabId = sender.tab.id;
  chrome.storage.session.get(tabKey(tabId)).then((items) => {
    const status = /** @type {PagTabStatus | undefined} */ (items[tabKey(tabId)]);
    let sameOrigin = false;
    try {
      sameOrigin = !!status && !!sender.url && new URL(status.url).origin === new URL(sender.url).origin;
    } catch {
      // Unparsable URL: treat as no data.
    }
    const result = sameOrigin ? status : null;
    // Tab-specific action badges can be reset on navigation; re-apply on every page load.
    updateActionBadge(tabId, result ? result.state : 'NOT_DETECTED');
    sendResponse(result);
  });
  return true; // Async response.
});
