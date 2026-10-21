// @ts-check
/**
 * Styles for the Shadow DOM UI (badge, panel, tooltip). Kept in JS so it can be
 * adopted into a closed shadow root without web_accessible_resources.
 */
(function (root) {
  /** @type {any} */
  const PAG = (root.PAG = root.PAG || {});

  PAG.UI_CSS = `
:host { all: initial; }
* { box-sizing: border-box; }
.layer {
  --bg: #ffffff; --fg: #202124; --muted: #5f6368; --line: #dadce0; --chip: #f1f3f4;
  --danger: #d93025; --warning: #e37400; --caution: #a56a00; --yellow: #f9ab00; --ok: #188038; --none: #80868b;
  font: 13px/1.5 system-ui, -apple-system, "Segoe UI", "Hiragino Sans", "Noto Sans JP", sans-serif;
  color: var(--fg);
}
@media (prefers-color-scheme: dark) {
  .layer { --bg: #2d2e31; --fg: #e8eaed; --muted: #9aa0a6; --line: #5f6368; --chip: #3c4043;
    --danger: #f28b82; --warning: #fcad70; --caution: #fdd663; --yellow: #fdd663; --ok: #81c995; }
}
.badge {
  position: fixed; right: 16px; bottom: 16px; max-width: calc(100vw - 32px);
  display: flex; align-items: center; gap: 8px; padding: 8px 12px;
  background: var(--bg); color: var(--fg); border: 2px solid var(--line); border-radius: 999px;
  box-shadow: 0 2px 10px rgba(0,0,0,.25); cursor: pointer; font: inherit; text-align: left;
}
.badge:focus-visible { outline: 3px solid #1a73e8; outline-offset: 2px; }
.badge[data-level="danger"] { border-color: var(--danger); }
.badge[data-level="warning"] { border-color: var(--yellow); }
.badge[data-level="ok"] { border-color: var(--ok); }
.badge[data-level="none"] { border-color: var(--none); }
.dot { flex: none; width: 10px; height: 10px; border-radius: 50%; background: var(--none); }
[data-level="danger"] .dot { background: var(--danger); }
[data-level="warning"] .dot { background: var(--yellow); }
[data-level="ok"] .dot { background: var(--ok); }
[data-level="none"] .dot { background: var(--yellow); box-shadow: 0 0 0 2px var(--none); }
.label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 600; }
.count { flex: none; padding: 0 6px; border-radius: 999px; background: var(--danger); color: #fff; font-size: 12px; }
.count[hidden] { display: none; }

.panel {
  position: fixed; right: 16px; bottom: 64px; width: 360px; max-width: calc(100vw - 32px);
  max-height: calc(100vh - 96px); overflow: auto; padding: 16px;
  background: var(--bg); color: var(--fg); border: 1px solid var(--line); border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0,0,0,.3);
}
.panel[hidden] { display: none; }
.panel h2 { margin: 0 0 4px; font-size: 15px; }
.panel h3 { margin: 14px 0 4px; font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: .04em; }
.panel p { margin: 0 0 6px; }
.panel ul { margin: 0; padding-left: 18px; }
.panel code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; word-break: break-all; }
.panel a { color: #1a73e8; }
@media (prefers-color-scheme: dark) { .panel a { color: #8ab4f8; } }
.note { color: var(--muted); font-size: 12px; }
.counts { display: flex; gap: 6px; flex-wrap: wrap; }
.chip { padding: 2px 8px; border-radius: 999px; background: var(--chip); font-size: 12px; }
.chip[data-sev="high"] { color: var(--danger); font-weight: 600; }
.chip[data-sev="medium"] { color: var(--warning); font-weight: 600; }
.chip[data-sev="caution"] { color: var(--caution); font-weight: 600; }
.actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 14px; }
.actions button {
  font: inherit; font-size: 12px; padding: 4px 10px; border-radius: 6px; cursor: pointer;
  background: var(--chip); color: var(--fg); border: 1px solid var(--line);
}

.tooltip {
  position: fixed; z-index: 1; max-width: min(420px, calc(100vw - 16px)); padding: 8px 10px;
  background: #202124; color: #fff; border-radius: 6px; font-size: 12px; line-height: 1.5;
  box-shadow: 0 2px 8px rgba(0,0,0,.3); pointer-events: none;
}
.tooltip[hidden] { display: none; }
.tooltip ul { margin: 0 0 4px; padding-left: 16px; }
.tooltip code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; word-break: break-all; color: #fdd663; }
`;
})(globalThis);
