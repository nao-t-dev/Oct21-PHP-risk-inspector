// @ts-check
/**
 * PHP security advisories this extension knows about.
 * To add a new advisory, append an entry to PAG.ADVISORIES and add boundary tests.
 */
(function (root) {
  /** @type {any} */
  const PAG = (root.PAG = root.PAG || {});

  /** @type {PagAdvisory[]} */
  PAG.ADVISORIES = [
    {
      id: 'php-2026-10-21',
      title: 'Security advisory: critical RCE vulnerabilities',
      published: '2026-10-21',
      url: 'https://www.php.net/archive/2026.php#2026-10-21-5',
      cvss: '9.2 (CVSS v4.0)',
      cves: [
        {
          id: 'CVE-2026-109618',
          summary: 'RCE via OOM corruption',
          url: 'https://github.com/php/php-src/security/advisories/GHSA-w8hw-w9fx-j79w',
        },
        {
          id: 'CVE-2026-109619',
          summary: 'RCE via stale global state',
          url: 'https://github.com/php/php-src/security/advisories/GHSA-6wmf-4rv5-p3rp',
        },
      ],
      // Supported branch -> first fixed release.
      fixed: {
        '8.5': '8.5.12',
        '8.4': '8.4.27',
        '8.3': '8.3.36',
        '8.2': '8.2.35',
      },
    },
  ];
})(globalThis);
