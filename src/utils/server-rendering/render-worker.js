"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const fetch_patch_1 = require("./fetch-patch");
const load_esm_from_memory_1 = require("./load-esm-from-memory");
/**
 * Renders each route in routes and writes them to <outputPath>/<route>/index.html.
 */
async function renderPage({ url, isAppShellRoute }) {
    const { ɵgetOrCreateAngularServerApp: getOrCreateAngularServerApp, ɵServerRenderContext: ServerRenderContext, } = await (0, load_esm_from_memory_1.loadEsmModuleFromMemory)('./main.server.mjs');
    const angularServerApp = getOrCreateAngularServerApp();
    const response = await angularServerApp.render(new Request(new URL(url, 'http://local-angular-prerender'), {
        signal: AbortSignal.timeout(30_000),
    }), undefined, isAppShellRoute ? ServerRenderContext.AppShell : ServerRenderContext.SSG);
    return response ? response.text() : null;
}
function initialize() {
    (0, fetch_patch_1.patchFetchToLoadInMemoryAssets)();
    return renderPage;
}
exports.default = initialize();
