// Editor-only type declarations for // @ts-check. Not shipped with the extension.

type PagState = 'VULNERABLE' | 'EOL' | 'UNKNOWN' | 'PRERELEASE' | 'PATCHED' | 'NOT_DETECTED';
type PagLevel = 'danger' | 'warning' | 'ok' | 'none';
type PagSeverity = 'high' | 'medium' | 'caution' | 'low';
type PagRuleId = 'R1' | 'R2' | 'R3a' | 'R3b' | 'R4' | 'R5' | 'R6' | 'R7' | 'R8';

interface PagAdvisory {
  id: string;
  title: string;
  published: string;
  url: string;
  cvss: string;
  cves: { id: string; summary: string; url: string }[];
  fixed: Record<string, string>;
}

interface PagVersion {
  raw: string;
  major: number;
  minor: number;
  patch: number | null;
  suffix: string;
  prerelease: boolean;
  distro: boolean;
}

interface PagEvidence {
  source: 'x-powered-by' | 'server' | 'set-cookie' | 'url' | string;
  value: string;
}

interface PagDetection {
  detected: boolean;
  version: string | null;
  evidence: PagEvidence[];
}

interface PagEvaluation {
  state: PagState;
  version: string | null;
  advisories: string[];
  distro: boolean;
}

/** Stored per tab in chrome.storage.session under `tab:<id>`. */
interface PagTabStatus extends PagEvaluation {
  /** Origin of the page (e.g. "https://example.com"), never the full URL. */
  url: string;
  evidence: PagEvidence[];
  checkedAt: number;
}

interface PagRule {
  id: PagRuleId;
  severity: PagSeverity;
  /** Used instead of `severity` when the page reports an unpatched / EOL PHP. */
  severityOnRiskyPhp?: PagSeverity;
  defaultEnabled: boolean;
}

interface PagLinkContext {
  /** The page reports a PHP version shown in red (VULNERABLE or EOL). */
  riskyPhp: boolean;
}

interface PagLinkResult {
  severity: PagSeverity;
  matches: PagRuleId[];
}

interface PagStats {
  total: number;
  high: number;
  medium: number;
  caution: number;
  low: number;
  byRule: Partial<Record<PagRuleId, number>>;
}

interface PagSettings {
  showBadge: boolean;
  showNotDetectedBadge: boolean;
  highlightLinks: boolean;
  highlightScope: 'all' | 'php-warning';
  rules: Record<PagRuleId, boolean>;
  excludedSites: string[];
  badgeHiddenSites: string[];
}

declare var PAG: any;
declare var tldts: any;
