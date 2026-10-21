// @ts-check
/**
 * PHP version parsing and advisory status evaluation. Pure functions only.
 * Requires lib/advisories.js to be loaded first.
 */
(function (root) {
  /** @type {any} */
  const PAG = (root.PAG = root.PAG || {});

  /** Display order: the first entry is the most severe. */
  const STATES = /** @type {const} */ ([
    'VULNERABLE',
    'EOL',
    'UNKNOWN',
    'PRERELEASE',
    'PATCHED',
    'NOT_DETECTED',
  ]);
  PAG.STATES = STATES;

  /** State -> colour group used by the badge, toolbar icon and popup. */
  PAG.STATE_LEVEL = {
    VULNERABLE: 'danger',
    EOL: 'danger',
    UNKNOWN: 'warning',
    PRERELEASE: 'warning',
    PATCHED: 'ok',
    NOT_DETECTED: 'none',
  };

  /**
   * Parse strings such as "8.3.10", "8.6.0RC3", "8.2.20-1+deb12u5", "7.4".
   * @param {string | null | undefined} str
   * @returns {PagVersion | null}
   */
  function parseVersion(str) {
    if (!str) return null;
    const m = /^(\d+)\.(\d+)(?:\.(\d+))?(.*)$/.exec(String(str).trim());
    if (!m) return null;
    const suffix = m[4] || '';
    const prerelease = /^[-.]?(alpha|beta|rc|dev)/i.test(suffix);
    return {
      raw: String(str).trim(),
      major: Number(m[1]),
      minor: Number(m[2]),
      patch: m[3] === undefined ? null : Number(m[3]),
      suffix,
      prerelease,
      // Distro builds such as "-1+deb12u5" or "-1ubuntu2.20" may carry backported fixes.
      distro: !prerelease && /^[-+~]/.test(suffix),
    };
  }

  /**
   * Compare two "x.y.z" versions (suffixes ignored). Missing patch counts as 0.
   * @param {PagVersion} a
   * @param {PagVersion} b
   */
  function compareVersions(a, b) {
    return a.major - b.major || a.minor - b.minor || (a.patch ?? 0) - (b.patch ?? 0);
  }

  /** @param {string} branch "8.4" */
  function parseBranch(branch) {
    const [major, minor] = branch.split('.').map(Number);
    return { major, minor };
  }

  /** @param {{major:number, minor:number}} a @param {{major:number, minor:number}} b */
  function compareBranch(a, b) {
    return a.major - b.major || a.minor - b.minor;
  }

  /**
   * Evaluate one version against one advisory.
   * @param {PagVersion} v
   * @param {PagAdvisory} adv
   * @returns {PagState}
   */
  function evaluateAgainst(v, adv) {
    const branches = Object.keys(adv.fixed).map(parseBranch).sort(compareBranch);
    const oldest = branches[0];
    const newest = branches[branches.length - 1];
    const key = `${v.major}.${v.minor}`;

    if (compareBranch(v, oldest) < 0) return 'EOL';
    if (v.prerelease) return 'PRERELEASE';
    if (compareBranch(v, newest) > 0) return 'PATCHED'; // Newer branch released after the fix.

    const fixed = adv.fixed[key];
    if (!fixed) return 'UNKNOWN'; // Branch gap inside the supported range; should not happen.
    if (v.patch === null) return 'UNKNOWN'; // "PHP/8.3" without patch level.
    const fixedVersion = /** @type {PagVersion} */ (parseVersion(fixed));
    return compareVersions(v, fixedVersion) < 0 ? 'VULNERABLE' : 'PATCHED';
  }

  /**
   * @param {PagState} a
   * @param {PagState} b
   */
  function worseState(a, b) {
    return STATES.indexOf(a) <= STATES.indexOf(b) ? a : b;
  }

  /**
   * Overall status for a detection result.
   * @param {{detected: boolean, version: string | null}} detection
   * @param {PagAdvisory[]} [advisories]
   * @returns {PagEvaluation}
   */
  function evaluate(detection, advisories = PAG.ADVISORIES) {
    if (!detection.detected) {
      return { state: 'NOT_DETECTED', version: null, advisories: [], distro: false };
    }
    const v = parseVersion(detection.version);
    if (!v) {
      return {
        state: 'UNKNOWN',
        version: detection.version,
        advisories: advisories.map((a) => a.id),
        distro: false,
      };
    }

    /** @type {PagState} */
    let state = 'PATCHED';
    /** @type {string[]} */
    const hit = [];
    for (const adv of advisories) {
      const s = evaluateAgainst(v, adv);
      if (s !== 'PATCHED') hit.push(adv.id);
      state = worseState(state, s);
    }
    return { state, version: v.raw, advisories: hit, distro: v.distro };
  }

  Object.assign(PAG, { parseVersion, compareVersions, evaluate, worseState });
})(globalThis);
