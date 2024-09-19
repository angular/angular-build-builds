"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAngularSSRMiddleware = createAngularSSRMiddleware;
const load_esm_1 = require("../../../utils/load-esm");
function createAngularSSRMiddleware(server, indexHtmlTransformer) {
    let cachedAngularServerApp;
    return function angularSSRMiddleware(req, res, next) {
        if (req.url === undefined) {
            return next();
        }
        const resolvedUrls = server.resolvedUrls;
        const baseUrl = resolvedUrls?.local[0] ?? resolvedUrls?.network[0];
        const url = new URL(req.url, baseUrl);
        (async () => {
            const { writeResponseToNodeResponse, createWebRequestFromNodeRequest } = await (0, load_esm_1.loadEsmModule)('@angular/ssr/node');
            const { ɵgetOrCreateAngularServerApp } = (await server.ssrLoadModule('/main.server.mjs'));
            const angularServerApp = ɵgetOrCreateAngularServerApp();
            // Only Add the transform hook only if it's a different instance.
            if (cachedAngularServerApp !== angularServerApp) {
                angularServerApp.hooks.on('html:transform:pre', async ({ html }) => {
                    const processedHtml = await server.transformIndexHtml(url.pathname, html);
                    return indexHtmlTransformer?.(processedHtml) ?? processedHtml;
                });
                cachedAngularServerApp = angularServerApp;
            }
            const webReq = new Request(createWebRequestFromNodeRequest(req), {
                signal: AbortSignal.timeout(30_000),
            });
            const webRes = await angularServerApp.render(webReq);
            if (!webRes) {
                return next();
            }
            return writeResponseToNodeResponse(webRes, res);
        })().catch(next);
    };
}
