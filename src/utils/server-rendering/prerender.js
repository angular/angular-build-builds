"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prerenderPages = prerenderPages;
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const node_url_1 = require("node:url");
const piscina_1 = __importDefault(require("piscina"));
const bundler_context_1 = require("../../tools/esbuild/bundler-context");
const url_1 = require("../url");
async function prerenderPages(workspaceRoot, baseHref, appShellOptions = {}, prerenderOptions = {}, outputFiles, assets, sourcemap = false, maxThreads = 1, verbose = false) {
    const outputFilesForWorker = {};
    const serverBundlesSourceMaps = new Map();
    const warnings = [];
    const errors = [];
    for (const { text, path, type } of outputFiles) {
        if (type !== bundler_context_1.BuildOutputFileType.Server) {
            continue;
        }
        // Contains the server runnable application code
        if ((0, node_path_1.extname)(path) === '.map') {
            serverBundlesSourceMaps.set(path.slice(0, -4), text);
        }
        else {
            outputFilesForWorker[path] = text;
        }
    }
    // Inline sourcemap into JS file. This is needed to make Node.js resolve sourcemaps
    // when using `--enable-source-maps` when using in memory files.
    for (const [filePath, map] of serverBundlesSourceMaps) {
        const jsContent = outputFilesForWorker[filePath];
        if (jsContent) {
            outputFilesForWorker[filePath] =
                jsContent +
                    `\n//# sourceMappingURL=` +
                    `data:application/json;base64,${Buffer.from(map).toString('base64')}`;
        }
    }
    serverBundlesSourceMaps.clear();
    const assetsReversed = {};
    for (const { source, destination } of assets) {
        assetsReversed[addLeadingSlash(destination.replace(/\\/g, node_path_1.posix.sep))] = source;
    }
    // Get routes to prerender
    const { routes: allRoutes, warnings: routesWarnings, errors: routesErrors, serializableRouteTreeNode, } = await getAllRoutes(workspaceRoot, baseHref, outputFilesForWorker, assetsReversed, appShellOptions, prerenderOptions, sourcemap, verbose);
    if (routesErrors?.length) {
        errors.push(...routesErrors);
    }
    if (routesWarnings?.length) {
        warnings.push(...routesWarnings);
    }
    if (allRoutes.size < 1 || errors.length > 0) {
        return {
            errors,
            warnings,
            output: {},
            serializableRouteTreeNode,
            prerenderedRoutes: allRoutes,
        };
    }
    // Render routes
    const { errors: renderingErrors, output } = await renderPages(baseHref, sourcemap, allRoutes, maxThreads, workspaceRoot, outputFilesForWorker, assetsReversed, appShellOptions);
    errors.push(...renderingErrors);
    return {
        errors,
        warnings,
        output,
        serializableRouteTreeNode,
        prerenderedRoutes: allRoutes,
    };
}
class RoutesSet extends Set {
    add(value) {
        return super.add(addLeadingSlash(value));
    }
}
async function renderPages(baseHref, sourcemap, allRoutes, maxThreads, workspaceRoot, outputFilesForWorker, assetFilesForWorker, appShellOptions) {
    const output = {};
    const errors = [];
    const workerExecArgv = [
        '--import',
        // Loader cannot be an absolute path on Windows.
        (0, node_url_1.pathToFileURL)((0, node_path_1.join)(__dirname, 'esm-in-memory-loader/register-hooks.js')).href,
    ];
    if (sourcemap) {
        workerExecArgv.push('--enable-source-maps');
    }
    const renderWorker = new piscina_1.default({
        filename: require.resolve('./render-worker'),
        maxThreads: Math.min(allRoutes.size, maxThreads),
        workerData: {
            workspaceRoot,
            outputFiles: outputFilesForWorker,
            assetFiles: assetFilesForWorker,
        },
        execArgv: workerExecArgv,
        recordTiming: false,
    });
    try {
        const renderingPromises = [];
        const appShellRoute = appShellOptions.route && addLeadingSlash(appShellOptions.route);
        const baseHrefWithLeadingSlash = addLeadingSlash(baseHref);
        for (const route of allRoutes) {
            // Remove base href from file output path.
            const routeWithoutBaseHref = addLeadingSlash(route.slice(baseHrefWithLeadingSlash.length - 1));
            const render = renderWorker.run({ url: route });
            const renderResult = render
                .then((content) => {
                if (content !== null) {
                    const outPath = node_path_1.posix.join(removeLeadingSlash(routeWithoutBaseHref), 'index.html');
                    const isAppShellRoute = appShellRoute === routeWithoutBaseHref;
                    output[outPath] = { content, appShellRoute: isAppShellRoute };
                }
            })
                .catch((err) => {
                errors.push(`An error occurred while prerendering route '${route}'.\n\n${err.stack ?? err.message ?? err.code ?? err}`);
                void renderWorker.destroy();
            });
            renderingPromises.push(renderResult);
        }
        await Promise.all(renderingPromises);
    }
    finally {
        void renderWorker.destroy();
    }
    return {
        errors,
        output,
    };
}
async function getAllRoutes(workspaceRoot, baseHref, outputFilesForWorker, assetFilesForWorker, appShellOptions, prerenderOptions, sourcemap, verbose) {
    const { routesFile, discoverRoutes } = prerenderOptions;
    const routes = new RoutesSet();
    const { route: appShellRoute } = appShellOptions;
    if (appShellRoute !== undefined) {
        routes.add((0, url_1.urlJoin)(baseHref, appShellRoute));
    }
    if (routesFile) {
        const routesFromFile = (await (0, promises_1.readFile)(routesFile, 'utf8')).split(/\r?\n/);
        for (const route of routesFromFile) {
            routes.add((0, url_1.urlJoin)(baseHref, route.trim()));
        }
    }
    if (!discoverRoutes) {
        return { routes, serializableRouteTreeNode: [] };
    }
    const workerExecArgv = [
        '--import',
        // Loader cannot be an absolute path on Windows.
        (0, node_url_1.pathToFileURL)((0, node_path_1.join)(__dirname, 'esm-in-memory-loader/register-hooks.js')).href,
    ];
    if (sourcemap) {
        workerExecArgv.push('--enable-source-maps');
    }
    const renderWorker = new piscina_1.default({
        filename: require.resolve('./routes-extractor-worker'),
        maxThreads: 1,
        workerData: {
            workspaceRoot,
            outputFiles: outputFilesForWorker,
            assetFiles: assetFilesForWorker,
        },
        execArgv: workerExecArgv,
        recordTiming: false,
    });
    const errors = [];
    const serializableRouteTreeNode = await renderWorker
        .run({})
        .catch((err) => {
        errors.push(`An error occurred while extracting routes.\n\n${err.stack}`);
    })
        .finally(() => {
        void renderWorker.destroy();
    });
    const skippedRedirects = [];
    const skippedOthers = [];
    for (const { route, redirectTo } of serializableRouteTreeNode) {
        if (redirectTo) {
            skippedRedirects.push(route);
        }
        else if (route.includes('*')) {
            skippedOthers.push(route);
        }
        else {
            routes.add(route);
        }
    }
    let warnings;
    if (verbose) {
        if (skippedOthers.length) {
            (warnings ??= []).push('The following routes were skipped from prerendering because they contain routes with dynamic parameters:\n' +
                skippedOthers.join('\n'));
        }
        if (skippedRedirects.length) {
            (warnings ??= []).push('The following routes were skipped from prerendering because they contain redirects:\n', skippedRedirects.join('\n'));
        }
    }
    return { routes, serializableRouteTreeNode, warnings };
}
function addLeadingSlash(value) {
    return value.charAt(0) === '/' ? value : '/' + value;
}
function removeLeadingSlash(value) {
    return value.charAt(0) === '/' ? value.slice(1) : value;
}
