"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const node_worker_threads_1 = require("node:worker_threads");
const fetch_patch_1 = require("./fetch-patch");
const load_esm_from_memory_1 = require("./load-esm-from-memory");
/**
 * This is passed as workerData when setting up the worker via the `piscina` package.
 */
const { document, verbose } = node_worker_threads_1.workerData;
/** Renders an application based on a provided options. */
async function extractRoutes() {
    const { ɵgetRoutesFromAngularRouterConfig: getRoutesFromAngularRouterConfig } = await (0, load_esm_from_memory_1.loadEsmModuleFromMemory)('./render-utils.server.mjs');
    const { default: bootstrapAppFnOrModule } = await (0, load_esm_from_memory_1.loadEsmModuleFromMemory)('./main.server.mjs');
    const skippedRedirects = [];
    const skippedOthers = [];
    const routes = [];
    const { routes: extractRoutes } = await getRoutesFromAngularRouterConfig(bootstrapAppFnOrModule, document, new URL('http://localhost'));
    for (const { route, redirectTo } of extractRoutes) {
        if (redirectTo !== undefined) {
            skippedRedirects.push(route);
        }
        else if (/[:*]/.test(route)) {
            skippedOthers.push(route);
        }
        else {
            routes.push(route);
        }
    }
    if (!verbose) {
        return { routes };
    }
    let warnings;
    if (skippedOthers.length) {
        (warnings ??= []).push('The following routes were skipped from prerendering because they contain routes with dynamic parameters:\n' +
            skippedOthers.join('\n'));
    }
    if (skippedRedirects.length) {
        (warnings ??= []).push('The following routes were skipped from prerendering because they contain redirects:\n', skippedRedirects.join('\n'));
    }
    return { routes, warnings };
}
function initialize() {
    (0, fetch_patch_1.patchFetchToLoadInMemoryAssets)();
    return extractRoutes;
}
exports.default = initialize();
