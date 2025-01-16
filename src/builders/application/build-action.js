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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runEsBuildBuildAction = runEsBuildBuildAction;
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const bundler_context_1 = require("../../tools/esbuild/bundler-context");
const sass_language_1 = require("../../tools/esbuild/stylesheets/sass-language");
const utils_1 = require("../../tools/esbuild/utils");
const environment_options_1 = require("../../utils/environment-options");
const results_1 = require("./results");
// Watch workspace for package manager changes
const packageWatchFiles = [
    // manifest can affect module resolution
    'package.json',
    // npm lock file
    'package-lock.json',
    // pnpm lock file
    'pnpm-lock.yaml',
    // yarn lock file including Yarn PnP manifest files (https://yarnpkg.com/advanced/pnp-spec/)
    'yarn.lock',
    '.pnp.cjs',
    '.pnp.data.json',
];
async function* runEsBuildBuildAction(action, options) {
    const { watch, poll, clearScreen, logger, cacheOptions, outputOptions, verbose, projectRoot, workspaceRoot, progress, preserveSymlinks, colors, jsonLogs, incrementalResults, } = options;
    const withProgress = progress ? utils_1.withSpinner : utils_1.withNoProgress;
    // Initial build
    let result;
    try {
        // Perform the build action
        result = await withProgress('Building...', () => action());
        // Log all diagnostic (error/warning/logs) messages
        await (0, utils_1.logMessages)(logger, result, colors, jsonLogs);
    }
    finally {
        // Ensure Sass workers are shutdown if not watching
        if (!watch) {
            (0, sass_language_1.shutdownSassWorkerPool)();
        }
    }
    // Setup watcher if watch mode enabled
    let watcher;
    if (watch) {
        if (progress) {
            logger.info('Watch mode enabled. Watching for file changes...');
        }
        const ignored = [
            // Ignore the output and cache paths to avoid infinite rebuild cycles
            outputOptions.base,
            cacheOptions.basePath,
            `${workspaceRoot.replace(/\\/g, '/')}/**/.*/**`,
        ];
        // Setup a watcher
        const { createWatcher } = await Promise.resolve().then(() => __importStar(require('../../tools/esbuild/watcher')));
        watcher = createWatcher({
            polling: typeof poll === 'number',
            interval: poll,
            followSymlinks: preserveSymlinks,
            ignored,
        });
        // Setup abort support
        options.signal?.addEventListener('abort', () => void watcher?.close());
        // Watch the entire project root if 'NG_BUILD_WATCH_ROOT' environment variable is set
        if (environment_options_1.shouldWatchRoot) {
            if (!preserveSymlinks) {
                // Ignore all node modules directories to avoid excessive file watchers.
                // Package changes are handled below by watching manifest and lock files.
                // NOTE: this is not enable when preserveSymlinks is true as this would break `npm link` usages.
                ignored.push('**/node_modules/**');
                watcher.add(packageWatchFiles
                    .map((file) => node_path_1.default.join(workspaceRoot, file))
                    .filter((file) => (0, node_fs_1.existsSync)(file)));
            }
            watcher.add(projectRoot);
        }
        // Watch locations provided by the initial build result
        watcher.add(result.watchFiles);
    }
    // Output the first build results after setting up the watcher to ensure that any code executed
    // higher in the iterator call stack will trigger the watcher. This is particularly relevant for
    // unit tests which execute the builder and modify the file system programmatically.
    yield* emitOutputResults(result, outputOptions);
    // Finish if watch mode is not enabled
    if (!watcher) {
        return;
    }
    // Wait for changes and rebuild as needed
    const currentWatchFiles = new Set(result.watchFiles);
    try {
        for await (const changes of watcher) {
            if (options.signal?.aborted) {
                break;
            }
            if (clearScreen) {
                // eslint-disable-next-line no-console
                console.clear();
            }
            if (verbose) {
                logger.info(changes.toDebugString());
            }
            // Clear removed files from current watch files
            changes.removed.forEach((removedPath) => currentWatchFiles.delete(removedPath));
            const rebuildState = result.createRebuildState(changes);
            result = await withProgress('Changes detected. Rebuilding...', () => action(rebuildState));
            // Log all diagnostic (error/warning/logs) messages
            await (0, utils_1.logMessages)(logger, result, colors, jsonLogs);
            // Update watched locations provided by the new build result.
            // Keep watching all previous files if there are any errors; otherwise consider all
            // files stale until confirmed present in the new result's watch files.
            const staleWatchFiles = result.errors.length > 0 ? undefined : new Set(currentWatchFiles);
            for (const watchFile of result.watchFiles) {
                if (!currentWatchFiles.has(watchFile)) {
                    // Add new watch location
                    watcher.add(watchFile);
                    currentWatchFiles.add(watchFile);
                }
                // Present so remove from stale locations
                staleWatchFiles?.delete(watchFile);
            }
            // Remove any stale locations if the build was successful
            if (staleWatchFiles?.size) {
                watcher.remove([...staleWatchFiles]);
            }
            for (const outputResult of emitOutputResults(result, outputOptions, changes, incrementalResults ? rebuildState : undefined)) {
                yield outputResult;
            }
        }
    }
    finally {
        // Stop the watcher and cleanup incremental rebuild state
        await Promise.allSettled([watcher.close(), result.dispose()]);
        (0, sass_language_1.shutdownSassWorkerPool)();
    }
}
function* emitOutputResults({ outputFiles, assetFiles, errors, warnings, externalMetadata, htmlIndexPath, htmlBaseHref, templateUpdates, }, outputOptions, changes, rebuildState) {
    if (errors.length > 0) {
        yield {
            kind: results_1.ResultKind.Failure,
            errors: errors,
            warnings: warnings,
            detail: {
                outputOptions,
            },
        };
        return;
    }
    // Template updates only exist if no other JS changes have occurred
    const hasTemplateUpdates = !!templateUpdates?.size;
    if (hasTemplateUpdates) {
        const updateResult = {
            kind: results_1.ResultKind.ComponentUpdate,
            updates: Array.from(templateUpdates, ([id, content]) => ({
                type: 'template',
                id,
                content,
            })),
        };
        yield updateResult;
    }
    // Use an incremental result if previous output information is available
    if (rebuildState && changes) {
        const { previousAssetsInfo, previousOutputInfo } = rebuildState;
        const incrementalResult = {
            kind: results_1.ResultKind.Incremental,
            warnings: warnings,
            // These files need to be updated in the dev server but should not signal any updates
            background: hasTemplateUpdates,
            added: [],
            removed: [],
            modified: [],
            files: {},
            detail: {
                externalMetadata,
                htmlIndexPath,
                htmlBaseHref,
                outputOptions,
            },
        };
        // Initially assume all previous output files have been removed
        const removedOutputFiles = new Map(previousOutputInfo);
        for (const file of outputFiles) {
            removedOutputFiles.delete(file.path);
            const previousHash = previousOutputInfo.get(file.path)?.hash;
            let needFile = false;
            if (previousHash === undefined) {
                needFile = true;
                incrementalResult.added.push(file.path);
            }
            else if (previousHash !== file.hash) {
                needFile = true;
                incrementalResult.modified.push(file.path);
            }
            if (needFile) {
                // Updates to non-JS files must signal an update with the dev server
                if (!/(?:\.js|\.map)?$/.test(file.path)) {
                    incrementalResult.background = false;
                }
                incrementalResult.files[file.path] = {
                    type: file.type,
                    contents: file.contents,
                    origin: 'memory',
                    hash: file.hash,
                };
            }
        }
        // Initially assume all previous assets files have been removed
        const removedAssetFiles = new Map(previousAssetsInfo);
        for (const { source, destination } of assetFiles) {
            removedAssetFiles.delete(source);
            if (!previousAssetsInfo.has(source)) {
                incrementalResult.added.push(destination);
            }
            else if (changes.modified.has(source)) {
                incrementalResult.modified.push(destination);
            }
            else {
                continue;
            }
            incrementalResult.files[destination] = {
                type: bundler_context_1.BuildOutputFileType.Browser,
                inputPath: source,
                origin: 'disk',
            };
        }
        // Include the removed output and asset files
        incrementalResult.removed.push(...Array.from(removedOutputFiles, ([file, { type }]) => ({
            path: file,
            type,
        })), ...Array.from(removedAssetFiles.values(), (file) => ({
            path: file,
            type: bundler_context_1.BuildOutputFileType.Browser,
        })));
        yield incrementalResult;
        return;
    }
    // Otherwise, use a full result
    const result = {
        kind: results_1.ResultKind.Full,
        warnings: warnings,
        files: {},
        detail: {
            externalMetadata,
            htmlIndexPath,
            htmlBaseHref,
            outputOptions,
        },
    };
    for (const file of assetFiles) {
        result.files[file.destination] = {
            type: bundler_context_1.BuildOutputFileType.Browser,
            inputPath: file.source,
            origin: 'disk',
        };
    }
    for (const file of outputFiles) {
        result.files[file.path] = {
            type: file.type,
            contents: file.contents,
            origin: 'memory',
            hash: file.hash,
        };
    }
    yield result;
}
