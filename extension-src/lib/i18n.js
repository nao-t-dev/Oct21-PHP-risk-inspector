// @ts-check
/**
 * Thin wrapper over chrome.i18n. Strings live in _locales/{ja,en}/messages.json.
 */
(function (root) {
  /** @type {any} */
  const PAG = (root.PAG = root.PAG || {});

  /**
   * @param {string} key
   * @param {string | string[]} [subs]
   */
  function t(key, subs) {
    const c = /** @type {any} */ (root).chrome;
    const msg = c?.i18n?.getMessage ? c.i18n.getMessage(key, subs) : '';
    return msg || key;
  }

  /**
   * Fill elements marked with data-i18n="key" (textContent) in extension pages.
   * @param {ParentNode} scope
   */
  function localizeDocument(scope) {
    for (const el of scope.querySelectorAll('[data-i18n]')) {
      el.textContent = t(/** @type {string} */ (el.getAttribute('data-i18n')));
    }
  }

  /**
   * Small DOM builder so UI code never needs innerHTML.
   * @param {string} tag
   * @param {Record<string, string> | null} [attrs]
   * @param {(Node | string | null | undefined | false)[]} [children]
   */
  function h(tag, attrs, children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) el.setAttribute(k, v);
    for (const c of children || []) {
      if (c === null || c === undefined || c === false) continue;
      el.append(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return el;
  }

  /**
   * @param {PagState} state
   * @param {string | null} version
   */
  function stateLabel(state, version) {
    const label = t(`state_${state}`);
    return version ? `PHP ${version} — ${label}` : label;
  }

  Object.assign(PAG, { t, localizeDocument, h, stateLabel });
})(globalThis);
