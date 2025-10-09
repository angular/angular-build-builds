"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupBrowserConfiguration = setupBrowserConfiguration;
const node_module_1 = require("node:module");
function findBrowserProvider(projectResolver) {
    // One of these must be installed in the project to use browser testing
    const vitestBuiltinProviders = ['playwright', 'webdriverio'];
    for (const providerName of vitestBuiltinProviders) {
        try {
            projectResolver(providerName);
            return providerName;
        }
        catch { }
    }
    return undefined;
}
function normalizeBrowserName(browserName) {
    // Normalize browser names to match Vitest's expectations for headless but also supports karma's names
    // e.g., 'ChromeHeadless' -> 'chrome', 'FirefoxHeadless' -> 'firefox'
    // and 'Chrome' -> 'chrome', 'Firefox' -> 'firefox'.
    const normalized = browserName.toLowerCase();
    return normalized.replace(/headless$/, '');
}
function setupBrowserConfiguration(browsers, debug, projectSourceRoot, viewport) {
    if (browsers === undefined) {
        return {};
    }
    const projectResolver = (0, node_module_1.createRequire)(projectSourceRoot + '/').resolve;
    let errors;
    try {
        projectResolver('@vitest/browser');
    }
    catch {
        errors ??= [];
        errors.push('The "browsers" option requires the "@vitest/browser" package to be installed within the project.' +
            ' Please install this package and rerun the test command.');
    }
    const provider = findBrowserProvider(projectResolver);
    if (!provider) {
        errors ??= [];
        errors.push('The "browsers" option requires either "playwright" or "webdriverio" to be installed within the project.' +
            ' Please install one of these packages and rerun the test command.');
    }
    // Vitest current requires the playwright browser provider to use the inspect-brk option used by "debug"
    if (debug && provider !== 'playwright') {
        errors ??= [];
        errors.push('Debugging browser mode tests currently requires the use of "playwright".' +
            ' Please install this package and rerun the test command.');
    }
    if (errors) {
        return { errors };
    }
    const isCI = !!process.env['CI'];
    const headless = isCI || browsers.some((name) => name.toLowerCase().includes('headless'));
    const browser = {
        enabled: true,
        provider,
        headless,
        ui: !headless,
        viewport,
        instances: browsers.map((browserName) => ({
            browser: normalizeBrowserName(browserName),
        })),
    };
    return { browser };
}
//# sourceMappingURL=browser-provider.js.map