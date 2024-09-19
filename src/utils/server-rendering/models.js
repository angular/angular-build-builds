"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouteRenderMode = void 0;
/**
 * Local copy of `RenderMode` exported from `@angular/ssr`.
 * This constant is needed to handle interop between CommonJS (CJS) and ES Modules (ESM) formats.
 *
 * It maps `RenderMode` enum values to their corresponding numeric identifiers.
 */
exports.RouteRenderMode = {
    AppShell: 0,
    Server: 1,
    Client: 2,
    Prerender: 3,
};
