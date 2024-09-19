"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const schema_1 = require("../../builders/application/schema");
const fetch_patch_1 = require("./fetch-patch");
const load_esm_from_memory_1 = require("./load-esm-from-memory");
/** Renders an application based on a provided options. */
async function extractRoutes({ outputMode, }) {
    const { ɵextractRoutesAndCreateRouteTree: extractRoutesAndCreateRouteTree } = await (0, load_esm_from_memory_1.loadEsmModuleFromMemory)('./main.server.mjs');
    const { routeTree, errors } = await extractRoutesAndCreateRouteTree(new URL('http://local-angular-prerender/'), undefined /** manifest */, true /** invokeGetPrerenderParams */, outputMode === schema_1.OutputMode.Server /** includePrerenderFallbackRoutes */);
    return {
        errors,
        serializedRouteTree: routeTree.toObject(),
    };
}
function initialize() {
    (0, fetch_patch_1.patchFetchToLoadInMemoryAssets)();
    return extractRoutes;
}
exports.default = initialize();
