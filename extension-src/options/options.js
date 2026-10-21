// @ts-check
(async function () {
  const PAG = /** @type {any} */ (globalThis).PAG;
  const { t, h } = PAG;
  const form = /** @type {HTMLElement} */ (document.querySelector('main'));
  const field = (/** @type {string} */ name) =>
    /** @type {HTMLInputElement & HTMLTextAreaElement} */ (form.querySelector(`[name="${name}"]`));

  PAG.localizeDocument(document);
  document.documentElement.lang = chrome.i18n.getUILanguage();
  /** @type {HTMLElement} */ (document.getElementById('version')).textContent =
    `v${chrome.runtime.getManifest().version}`;

  // Rule checkboxes are generated from PAG.RULES so new rules show up automatically.
  /** @type {HTMLElement} */ (document.getElementById('rules')).replaceChildren(
    ...PAG.RULE_IDS.map((/** @type {PagRuleId} */ id) => {
      const { severity: sev, severityOnRiskyPhp: risky } = PAG.RULES[id];
      return h('label', { class: 'row' }, [
        h('input', { type: 'checkbox', name: `rule-${id}` }),
        h('span', { class: 'rule-id' }, [id]),
        h('span', { class: 'sev', 'data-sev': sev }, [t(`severity_${sev}`)]),
        h('span', null, [
          t(`rule_${id}`),
          risky && h('span', { class: 'note' }, [' ', t('severity_on_risky_php', t(`severity_${risky}`))]),
        ]),
      ]);
    }),
  );

  /** @param {string} text */
  const parseSites = (text) =>
    [...new Set(text.split(/[\s,]+/).map((s) => s.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')))]
      .filter(Boolean);

  /** @param {PagSettings} s */
  function render(s) {
    field('showBadge').checked = s.showBadge;
    field('showNotDetectedBadge').checked = s.showNotDetectedBadge;
    field('highlightLinks').checked = s.highlightLinks;
    for (const r of form.querySelectorAll('input[name="highlightScope"]')) {
      /** @type {HTMLInputElement} */ (r).checked = /** @type {HTMLInputElement} */ (r).value === s.highlightScope;
    }
    for (const id of /** @type {PagRuleId[]} */ (PAG.RULE_IDS)) field(`rule-${id}`).checked = !!s.rules[id];
    field('excludedSites').value = s.excludedSites.join('\n');
    field('badgeHiddenSites').value = s.badgeHiddenSites.join('\n');
  }

  /** @returns {PagSettings} */
  function read() {
    const checked = /** @type {HTMLInputElement | null} */ (form.querySelector('input[name="highlightScope"]:checked'));
    /** @type {Record<string, boolean>} */
    const rules = {};
    for (const id of PAG.RULE_IDS) rules[id] = field(`rule-${id}`).checked;
    return PAG.mergeSettings({
      showBadge: field('showBadge').checked,
      showNotDetectedBadge: field('showNotDetectedBadge').checked,
      highlightLinks: field('highlightLinks').checked,
      highlightScope: checked?.value === 'php-warning' ? 'php-warning' : 'all',
      rules: /** @type {Record<PagRuleId, boolean>} */ (rules),
      excludedSites: parseSites(field('excludedSites').value),
      badgeHiddenSites: parseSites(field('badgeHiddenSites').value),
    });
  }

  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let savedTimer;
  async function save() {
    await PAG.saveSettings(read());
    const saved = /** @type {HTMLElement} */ (document.getElementById('saved'));
    saved.hidden = false;
    clearTimeout(savedTimer);
    savedTimer = setTimeout(() => (saved.hidden = true), 1500);
  }

  render(await PAG.loadSettings());
  form.addEventListener('change', save); // Textareas fire "change" on blur.

  /** @type {HTMLElement} */ (document.getElementById('reset')).addEventListener('click', async () => {
    const d = PAG.defaultSettings();
    render(d);
    await PAG.saveSettings(d);
  });

  // Keep in sync when the popup or badge changes settings while this page is open.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.settings && document.activeElement?.tagName !== 'TEXTAREA') {
      render(PAG.mergeSettings(changes.settings.newValue));
    }
  });
})();
