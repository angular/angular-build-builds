"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAngularSsrInternalMiddleware = createAngularSsrInternalMiddleware;
exports.createAngularSsrExternalMiddleware = createAngularSsrExternalMiddleware;
const load_esm_1 = require("../../../utils/load-esm");
const utils_1 = require("../../../utils/server-rendering/utils");
function createAngularSsrInternalMiddleware(server, indexHtmlTransformer) {
    let cachedAngularServerApp;
    return function angularSsrMiddleware(req, res, next) {
        if (req.url === undefined) {
            return next();
        }
        (async () => {
            const { writeResponseToNodeResponse, createWebRequestFromNodeRequest } = await (0, load_esm_1.loadEsmModule)('@angular/ssr/node');
            const { ɵgetOrCreateAngularServerApp } = (await server.ssrLoadModule('/main.server.mjs'));
            const angularServerApp = ɵgetOrCreateAngularServerApp();
            // Only Add the transform hook only if it's a different instance.
            if (cachedAngularServerApp !== angularServerApp) {
                angularServerApp.hooks.on('html:transform:pre', async ({ html, url }) => {
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
async function createAngularSsrExternalMiddleware(server, indexHtmlTransformer) {
    let fallbackWarningShown = false;
    let cachedAngularAppEngine;
    let angularSsrInternalMiddleware;
    const { createWebRequestFromNodeRequest, writeResponseToNodeResponse } = await (0, load_esm_1.loadEsmModule)('@angular/ssr/node');
    return function angularSsrExternalMiddleware(req, res, next) {
        (async () => {
            const { default: handler, AngularAppEngine } = (await server.ssrLoadModule('./server.mjs'));
            if (!(0, utils_1.isSsrNodeRequestHandler)(handler) && !(0, utils_1.isSsrRequestHandler)(handler)) {
                if (!fallbackWarningShown) {
                    // eslint-disable-next-line no-console
                    console.warn(`The default export in 'server.ts' does not provide a Node.js request handler. ` +
                        'Using the internal SSR middleware instead.');
                    fallbackWarningShown = true;
                }
                angularSsrInternalMiddleware ??= createAngularSsrInternalMiddleware(server, indexHtmlTransformer);
                angularSsrInternalMiddleware(req, res, next);
                return;
            }
            if (cachedAngularAppEngine !== AngularAppEngine) {
                AngularAppEngine.ɵhooks.on('html:transform:pre', async ({ html, url }) => {
                    const processedHtml = await server.transformIndexHtml(url.pathname, html);
                    return indexHtmlTransformer?.(processedHtml) ?? processedHtml;
                });
                cachedAngularAppEngine = AngularAppEngine;
            }
            // Forward the request to the middleware in server.ts
            if ((0, utils_1.isSsrNodeRequestHandler)(handler)) {
                await handler(req, res, next);
            }
            else {
                const webRes = await handler(createWebRequestFromNodeRequest(req));
                if (!webRes) {
                    next();
                    return;
                }
                await writeResponseToNodeResponse(webRes, res);
            }
        })().catch(next);
    };
}
