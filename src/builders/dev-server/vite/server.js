"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupServer = setupServer;
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const plugins_1 = require("../../../tools/vite/plugins");
const utils_1 = require("../../../tools/vite/utils");
const utils_2 = require("../../../utils");
const load_esm_1 = require("../../../utils/load-esm");
async function createServerConfig(serverOptions, assets, ssrMode, preTransformRequests, cacheDir) {
    const proxy = await (0, utils_2.loadProxyConfiguration)(serverOptions.workspaceRoot, serverOptions.proxyConfig);
    // Files used for SSR warmup.
    let ssrFiles;
    switch (ssrMode) {
        case plugins_1.ServerSsrMode.InternalSsrMiddleware:
            ssrFiles = ['./main.server.mjs'];
            break;
        case plugins_1.ServerSsrMode.ExternalSsrMiddleware:
            ssrFiles = ['./main.server.mjs', './server.mjs'];
            break;
    }
    const server = {
        preTransformRequests,
        warmup: {
            ssrFiles,
        },
        port: serverOptions.port,
        strictPort: true,
        host: serverOptions.host,
        open: serverOptions.open,
        allowedHosts: serverOptions.allowedHosts,
        headers: serverOptions.headers,
        // Disable the websocket if live reload is disabled (false/undefined are the only valid values)
        ws: serverOptions.liveReload === false && serverOptions.hmr === false ? false : undefined,
        // When server-side rendering (SSR) is enabled togather with SSL and Express is being used,
        // we must configure Vite to use HTTP/1.1.
        // This is necessary because Express does not support HTTP/2.
        // We achieve this by defining an empty proxy.
        // See: https://github.com/vitejs/vite/blob/c4b532cc900bf988073583511f57bd581755d5e3/packages/vite/src/node/http.ts#L106
        proxy: serverOptions.ssl && ssrMode === plugins_1.ServerSsrMode.ExternalSsrMiddleware ? (proxy ?? {}) : proxy,
        cors: {
            // This will add the header `Access-Control-Allow-Origin: http://example.com`,
            // where `http://example.com` is the requesting origin.
            origin: true,
            // Allow preflight requests to be proxied.
            preflightContinue: true,
        },
        // File watching is handled by the build directly. `null` disables file watching for Vite.
        watch: null,
        fs: {
            // Ensure cache directory, node modules, and all assets are accessible by the client.
            // The first two are required for Vite to function in prebundling mode (the default) and to load
            // the Vite client-side code for browser reloading. These would be available by default but when
            // the `allow` option is explicitly configured, they must be included manually.
            allow: [
                cacheDir,
                (0, node_path_1.join)(serverOptions.workspaceRoot, 'node_modules'),
                ...[...assets.values()].map(({ source }) => source),
            ],
        },
    };
    if (serverOptions.ssl) {
        if (serverOptions.sslCert && serverOptions.sslKey) {
            server.https = {
                cert: await (0, promises_1.readFile)(serverOptions.sslCert),
                key: await (0, promises_1.readFile)(serverOptions.sslKey),
            };
        }
    }
    return server;
}
function createSsrConfig(externalMetadata, serverOptions, prebundleTransformer, zoneless, target, prebundleLoaderExtensions, thirdPartySourcemaps, define) {
    return {
        // Note: `true` and `/.*/` have different sematics. When true, the `external` option is ignored.
        noExternal: /.*/,
        // Exclude any Node.js built in module and provided dependencies (currently build defined externals)
        external: externalMetadata.explicitServer,
        optimizeDeps: (0, utils_1.getDepOptimizationConfig)({
            // Only enable with caching since it causes prebundle dependencies to be cached
            disabled: serverOptions.prebundle === false,
            // Exclude any explicitly defined dependencies (currently build defined externals and node.js built-ins)
            exclude: externalMetadata.explicitServer,
            // Include all implict dependencies from the external packages internal option
            include: externalMetadata.implicitServer,
            ssr: true,
            prebundleTransformer,
            zoneless,
            target,
            loader: prebundleLoaderExtensions,
            thirdPartySourcemaps,
            define,
        }),
    };
}
async function setupServer(serverOptions, outputFiles, assets, preserveSymlinks, externalMetadata, ssrMode, prebundleTransformer, target, zoneless, componentStyles, templateUpdates, prebundleLoaderExtensions, define, extensionMiddleware, indexHtmlTransformer, thirdPartySourcemaps = false) {
    // dynamically import Vite for ESM compatibility
    const { normalizePath } = await (0, load_esm_1.loadEsmModule)('vite');
    // Path will not exist on disk and only used to provide separate path for Vite requests
    const virtualProjectRoot = normalizePath((0, node_path_1.join)(serverOptions.workspaceRoot, `.angular/vite-root`, serverOptions.buildTarget.project));
    /**
     * Required when using `externalDependencies` to prevent Vite load errors.
     *
     * @note Can be removed if Vite introduces native support for externals.
     * @note Vite misresolves browser modules in SSR when accessing URLs with multiple segments
     *       (e.g., 'foo/bar'), as they are not correctly re-based from the base href.
     */
    const preTransformRequests = externalMetadata.explicitBrowser.length === 0 && ssrMode === plugins_1.ServerSsrMode.NoSsr;
    const cacheDir = (0, node_path_1.join)(serverOptions.cacheOptions.path, serverOptions.buildTarget.project, 'vite');
    const configuration = {
        configFile: false,
        envFile: false,
        cacheDir,
        root: virtualProjectRoot,
        publicDir: false,
        esbuild: false,
        mode: 'development',
        // We use custom as we do not rely on Vite's htmlFallbackMiddleware and indexHtmlMiddleware.
        appType: 'custom',
        css: {
            devSourcemap: true,
        },
        // Ensure custom 'file' loader build option entries are handled by Vite in application code that
        // reference third-party libraries. Relative usage is handled directly by the build and not Vite.
        // Only 'file' loader entries are currently supported directly by Vite.
        assetsInclude: prebundleLoaderExtensions &&
            Object.entries(prebundleLoaderExtensions)
                .filter(([, value]) => value === 'file')
                // Create a file extension glob for each key
                .map(([key]) => '*' + key),
        // Vite will normalize the `base` option by adding a leading slash.
        base: serverOptions.servePath,
        resolve: {
            mainFields: ['es2020', 'browser', 'module', 'main'],
            preserveSymlinks,
        },
        dev: {
            preTransformRequests,
        },
        server: await createServerConfig(serverOptions, assets, ssrMode, preTransformRequests, cacheDir),
        ssr: createSsrConfig(externalMetadata, serverOptions, prebundleTransformer, zoneless, target, prebundleLoaderExtensions, thirdPartySourcemaps, define),
        plugins: [
            (0, plugins_1.createAngularSetupMiddlewaresPlugin)({
                outputFiles,
                assets,
                indexHtmlTransformer,
                extensionMiddleware,
                componentStyles,
                templateUpdates,
                ssrMode,
                resetComponentUpdates: () => templateUpdates.clear(),
                projectRoot: serverOptions.projectRoot,
            }),
            (0, plugins_1.createRemoveIdPrefixPlugin)(externalMetadata.explicitBrowser),
            await (0, plugins_1.createAngularSsrTransformPlugin)(serverOptions.workspaceRoot),
            await (0, plugins_1.createAngularMemoryPlugin)({
                virtualProjectRoot,
                outputFiles,
                templateUpdates,
                external: externalMetadata.explicitBrowser,
                disableViteTransport: !serverOptions.liveReload,
            }),
        ],
        // Browser only optimizeDeps. (This does not run for SSR dependencies).
        optimizeDeps: (0, utils_1.getDepOptimizationConfig)({
            // Only enable with caching since it causes prebundle dependencies to be cached
            disabled: serverOptions.prebundle === false,
            // Exclude any explicitly defined dependencies (currently build defined externals)
            exclude: externalMetadata.explicitBrowser,
            // Include all implict dependencies from the external packages internal option
            include: externalMetadata.implicitBrowser,
            ssr: false,
            prebundleTransformer,
            target,
            zoneless,
            loader: prebundleLoaderExtensions,
            thirdPartySourcemaps,
            define,
        }),
    };
    if (serverOptions.ssl) {
        if (!serverOptions.sslCert || !serverOptions.sslKey) {
            const { default: basicSslPlugin } = await Promise.resolve().then(() => __importStar(require('@vitejs/plugin-basic-ssl')));
            configuration.plugins ??= [];
            configuration.plugins.push(basicSslPlugin());
        }
    }
    return configuration;
}
//# sourceMappingURL=server.js.map