// @ts-check
/**
 * User settings (chrome.storage.sync). Requires lib/link-rules.js for rule defaults.
 */
(function (root) {
  /** @type {any} */
  const PAG = (root.PAG = root.PAG || {});

  /** @returns {PagSettings} */
  function defaultSettings() {
    /** @type {Record<string, boolean>} */
    const rules = {};
    for (const id of PAG.RULE_IDS) rules[id] = PAG.RULES[id].defaultEnabled;
    return {
      showBadge: true,
      showNotDetectedBadge: true,
      highlightLinks: true,
      highlightScope: 'all', // 'all' | 'php-warning'
      rules: /** @type {Record<PagRuleId, boolean>} */ (rules),
      excludedSites: [], // All features off on these hosts.
      badgeHiddenSites: [], // Only the floating badge is hidden on these hosts.
    };
  }

  /**
   * Merge stored values over defaults so new settings get sensible values after updates.
   * @param {Partial<PagSettings> | undefined} stored
   * @returns {PagSettings}
   */
  function mergeSettings(stored) {
    const d = defaultSettings();
    const s = stored || {};
    return {
      ...d,
      ...s,
      rules: { ...d.rules, ...(s.rules || {}) },
      excludedSites: Array.isArray(s.excludedSites) ? s.excludedSites : d.excludedSites,
      badgeHiddenSites: Array.isArray(s.badgeHiddenSites) ? s.badgeHiddenSites : d.badgeHiddenSites,
    };
  }

  /** @returns {Promise<PagSettings>} */
  async function loadSettings() {
    const { settings } = await chrome.storage.sync.get('settings');
    return mergeSettings(/** @type {Partial<PagSettings> | undefined} */ (settings));
  }

  /** @param {PagSettings} settings */
  async function saveSettings(settings) {
    await chrome.storage.sync.set({ settings });
  }

  /**
   * True when hostname equals an entry or is a subdomain of it.
   * @param {string} hostname
   * @param {string[]} list
   */
  function hostInList(hostname, list) {
    const host = hostname.toLowerCase();
    return list.some((entry) => {
      const e = entry.trim().toLowerCase();
      return e !== '' && (host === e || host.endsWith(`.${e}`));
    });
  }

  Object.assign(PAG, { defaultSettings, mergeSettings, loadSettings, saveSettings, hostInList });
})(globalThis);
