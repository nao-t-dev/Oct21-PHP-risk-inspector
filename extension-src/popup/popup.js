// @ts-check
(async function () {
  const PAG = /** @type {any} */ (globalThis).PAG;
  const { t, h } = PAG;
  const $ = (/** @type {string} */ id) => /** @type {HTMLElement} */ (document.getElementById(id));

  PAG.localizeDocument(document);
  document.documentElement.lang = chrome.i18n.getUILanguage();
  $('open-options').addEventListener('click', () => chrome.runtime.openOptionsPage());

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  /** @type {URL | null} */
  let pageUrl = null;
  try {
    pageUrl = tab?.url ? new URL(tab.url) : null;
  } catch {
    pageUrl = null;
  }

  if (!tab?.id || !pageUrl || !/^https?:$/.test(pageUrl.protocol)) {
    $('status-label').textContent = t('popup_unsupported');
    $('links-section').hidden = true;
    $('site-section').hidden = true;
    return;
  }
  const tabId = tab.id;
  const hostname = pageUrl.hostname;

  // PHP status (written by the service worker).
  const key = `tab:${tabId}`;
  const stored = /** @type {PagTabStatus | undefined} */ ((await chrome.storage.session.get(key))[key]);
  const status = stored && new URL(stored.url).origin === pageUrl.origin ? stored : null;
  if (status) {
    $('status').dataset.level = PAG.STATE_LEVEL[status.state];
    $('status-label').textContent = PAG.stateLabel(status.state, status.version);
    $('status-desc').textContent = t(`state_desc_${status.state}`);
    $('status-distro').hidden = !status.distro;
    $('evidence').replaceChildren(
      ...status.evidence.map((e) =>
        h('li', null, [t(`evidence_${e.source.replace(/-/g, '_')}`), ': ', h('code', null, [e.value])]),
      ),
    );
  } else {
    $('status-label').textContent = t('popup_reload');
  }

  // Link stats (from the content script).
  /** @type {{hostname: string, stats: PagStats} | undefined} */
  const info = await chrome.tabs.sendMessage(tabId, { type: 'getPageInfo' }).catch(() => undefined);
  if (!info) {
    $('links-empty').textContent = t('popup_reload');
    $('links-empty').hidden = false;
  } else if (info.stats.total === 0) {
    $('links-empty').textContent = t('panel_no_suspicious_links');
    $('links-empty').hidden = false;
  } else {
    const rows = PAG.RULE_IDS.filter((/** @type {PagRuleId} */ id) => info.stats.byRule[id]).map(
      (/** @type {PagRuleId} */ id) => {
        const sev = PAG.ruleSeverity(id, { riskyPhp: !!status && PAG.STATE_LEVEL[status.state] === 'danger' });
        return h('tr', null, [
          h('td', null, [h('span', { class: 'sev', 'data-sev': sev }, [t(`severity_${sev}`)]), t(`rule_${id}`)]),
          h('td', null, [String(info.stats.byRule[id])]),
        ]);
      },
    );
    $('links-body').replaceChildren(...rows);
    $('links-table').hidden = false;
  }

  // Per-site exclusion.
  const checkbox = /** @type {HTMLInputElement} */ ($('exclude-site'));
  $('site-host').textContent = t('popup_site_target', hostname);
  checkbox.checked = PAG.hostInList(hostname, (await PAG.loadSettings()).excludedSites);
  checkbox.addEventListener('change', async () => {
    const settings = await PAG.loadSettings();
    const list = settings.excludedSites.filter((/** @type {string} */ s) => s.toLowerCase() !== hostname);
    if (checkbox.checked) list.push(hostname);
    settings.excludedSites = list;
    await PAG.saveSettings(settings);
  });
})();
