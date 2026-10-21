// Loads the classic-script libraries into globalThis, the same way the extension does.
import '../../../extension-src/vendor/tldts.min.js';
import '../../../extension-src/lib/advisories.js';
import '../../../extension-src/lib/version.js';
import '../../../extension-src/lib/php-detect.js';
import '../../../extension-src/lib/link-rules.js';
import '../../../extension-src/lib/settings.js';

export const PAG = /** @type {any} */ (globalThis).PAG;
