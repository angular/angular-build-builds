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
exports.executeLibraryBuilder = executeLibraryBuilder;
const promises_1 = __importDefault(require("node:fs/promises"));
const sass_language_1 = require("../../tools/esbuild/stylesheets/sass-language");
const target_1 = require("../../tools/esbuild/target");
const utils_1 = require("../../tools/esbuild/utils");
const delete_output_dir_1 = require("../../utils/delete-output-dir");
const error_1 = require("../../utils/error");
const hash_1 = require("../../utils/hash");
const path_1 = require("../../utils/path");
const profiling_1 = require("../../utils/profiling");
const purge_cache_1 = require("../../utils/purge-cache");
const supported_browsers_1 = require("../../utils/supported-browsers");
const version_1 = require("../../utils/version");
const options_1 = require("./options");
const entry_points_1 = require("./pipeline/entry-points");
/**
 * Executes the library builder to compile, bundle, and package an Angular library into the Angular Package Format (APF).
 *
 * @param options The raw builder schema options.
 * @param context The architect builder execution context.
 * @returns An async iterator yielding builder output results.
 */
async function* executeLibraryBuilder(options, context) {
    (0, version_1.assertCompatibleAngularVersion)(context.workspaceRoot);
    await (0, hash_1.initializeHash)();
    // Purge old build disk cache
    await (0, purge_cache_1.purgeStaleBuildCache)(context);
    const projectName = context.target?.project;
    if (!projectName) {
        yield { success: false, error: 'The library builder requires a target.' };
        return;
    }
    const normalizedOptions = await (0, options_1.normalizeLibraryOptions)(context, projectName, options);
    const { workspaceRoot, projectRoot, outputPath, deleteOutputPath, packageJsonPath, tsConfigPath, watch: isWatchMode, poll, cacheOptions, preserveSymlinks, progress, } = normalizedOptions;
    let signal = context.signal;
    if (!signal) {
        const controller = new AbortController();
        signal = controller.signal;
        context.addTeardown?.(() => controller.abort('builder-teardown'));
    }
    const { logger } = context;
    const withProgress = progress ? utils_1.withSpinner : utils_1.withNoProgress;
    // Clean output directory
    if (deleteOutputPath) {
        await (0, delete_output_dir_1.deleteOutputDir)(workspaceRoot, outputPath);
    }
    // Dynamically lazy-loaded to prevent importing dependencies at the top level.
    const [{ buildAction, createSingleBuildState, hasModifiedWatchedFile }, { createComponentStylesheetBundlerForLibrary },] = await Promise.all([
        Promise.resolve().then(() => __importStar(require('./pipeline/build-action'))),
        Promise.resolve().then(() => __importStar(require('./pipeline/stylesheet-bundler'))),
    ]);
    let stylesheetBundler;
    let watcher;
    const buildState = createSingleBuildState();
    try {
        const browsers = (0, supported_browsers_1.getSupportedBrowsers)(projectRoot, logger);
        const target = (0, target_1.transformSupportedBrowsersToTargets)(browsers);
        stylesheetBundler = createComponentStylesheetBundlerForLibrary(normalizedOptions, isWatchMode, target);
        // Track all referenced files for watch mode
        const allWatchedFiles = new Set([
            (0, path_1.toPosixPath)(tsConfigPath),
            (0, path_1.toPosixPath)(packageJsonPath),
        ]);
        for (const entryPoint of normalizedOptions.entryPoints.values()) {
            allWatchedFiles.add((0, path_1.toPosixPath)(entryPoint.entryFilePath));
        }
        if (isWatchMode) {
            if (progress) {
                logger.info('Watch mode enabled. Watching for file changes...');
            }
            const { setupWatcher } = await Promise.resolve().then(() => __importStar(require('../../utils/watcher')));
            watcher = await setupWatcher({
                workspaceRoot,
                projectRoot,
                outputPath,
                cacheOptions,
                poll,
                preserveSymlinks,
                signal,
                watchFiles: allWatchedFiles,
            });
            context.addTeardown?.(() => void watcher?.close());
        }
        // Execute initial build
        const initialResult = await executeBuild('Building...', {
            options: normalizedOptions,
            stylesheetBundler,
            allWatchedFiles,
            isWatchMode,
            context,
            buildState,
        }, withProgress, watcher, buildAction);
        yield initialResult;
        if (!isWatchMode || !watcher) {
            return;
        }
        yield* runWatchLoop(watcher, normalizedOptions, stylesheetBundler, allWatchedFiles, context, withProgress, buildState, buildAction, hasModifiedWatchedFile, signal);
    }
    finally {
        (0, profiling_1.logCumulativeDurations)();
        (0, sass_language_1.shutdownSassWorkerPool)();
        await Promise.allSettled([
            watcher?.close(),
            stylesheetBundler?.dispose(),
            buildState.singleProgramCache?.compilationInstance.close?.(),
        ]);
    }
}
async function executeBuild(message, actionContext, withProgress, watcher, buildAction) {
    const startTime = process.hrtime.bigint();
    const { context, allWatchedFiles, isWatchMode } = actionContext;
    try {
        await withProgress(message, () => buildAction(actionContext));
        logBuildResult(context.logger, startTime, true);
        if (isWatchMode) {
            (0, profiling_1.logCumulativeDurations)();
        }
        return { success: true };
    }
    catch (error) {
        (0, error_1.assertIsError)(error);
        logBuildResult(context.logger, startTime, false);
        return { success: false, error: error.message };
    }
    finally {
        watcher?.add(Array.from(allWatchedFiles));
    }
}
/**
 * Runs the watch loop, rebuilding the library as watched files are modified.
 */
async function* runWatchLoop(watcher, options, stylesheetBundler, allWatchedFiles, context, withProgress, buildState, buildAction, hasModifiedWatchedFile, signal) {
    const { checkAssetChanges } = await Promise.resolve().then(() => __importStar(require('./pipeline/assets')));
    const { workspaceRoot, packageJsonPath, assets, clearScreen } = options;
    const posixPackageJsonPath = (0, path_1.toPosixPath)(packageJsonPath);
    for await (const changes of watcher) {
        if (signal?.aborted) {
            break;
        }
        if (clearScreen) {
            // eslint-disable-next-line no-console
            console.clear();
        }
        const changedFiles = new Set();
        let hasStyleChanges = false;
        let hasSassChanges = false;
        for (const file of changes.all) {
            const posixFile = (0, path_1.toPosixPath)(file);
            changedFiles.add(posixFile);
            if (/\.(?:scss|sass)$/i.test(posixFile)) {
                hasStyleChanges = true;
                hasSassChanges = true;
            }
            else if (/\.(?:less|css)$/i.test(posixFile)) {
                hasStyleChanges = true;
            }
        }
        if (hasStyleChanges) {
            if (hasSassChanges) {
                (0, sass_language_1.resetSassWorkerPoolCaches)();
            }
            const invalidatedStyles = stylesheetBundler.invalidate(changedFiles);
            if (invalidatedStyles) {
                for (const styleFile of invalidatedStyles) {
                    changedFiles.add((0, path_1.toPosixPath)(styleFile));
                }
            }
        }
        // Check if package.json was modified
        let hasPackageJsonChanges = false;
        if (changedFiles.has(posixPackageJsonPath)) {
            try {
                const packageJson = await loadPackageJson(packageJsonPath);
                options.packageJson = packageJson;
                if (!packageJson.name) {
                    throw new Error(`The package.json at '${packageJsonPath}' must contain a 'name'.`);
                }
                options.packageName = packageJson.name;
                (0, entry_points_1.updateWatchedEntryPoints)(packageJson, options, buildState, allWatchedFiles, packageJsonPath);
                hasPackageJsonChanges = true;
            }
            catch (error) {
                (0, error_1.assertIsError)(error);
                await buildState.singleProgramCache?.compilationInstance.update?.(changedFiles);
                buildState.hasEmittedManifests = false;
                yield {
                    success: false,
                    error: `Failed to reload 'package.json': ${error.message}`,
                };
                continue;
            }
        }
        const hasSourceChanges = !buildState.singleProgramCache ||
            buildState.hasCompilationError ||
            buildState.hasEntryPointsChanges ||
            hasModifiedWatchedFile(changedFiles, allWatchedFiles, posixPackageJsonPath);
        if (!hasSourceChanges &&
            !hasPackageJsonChanges &&
            !checkAssetChanges(assets, workspaceRoot, changedFiles)) {
            continue;
        }
        yield await executeBuild('Changes detected. Rebuilding...', {
            options,
            stylesheetBundler,
            allWatchedFiles,
            isWatchMode: true,
            context,
            buildState,
            modifiedFiles: changedFiles,
        }, withProgress, watcher, buildAction);
    }
}
/**
 * Loads and parses a JSON file from disk.
 */
async function loadPackageJson(packageJsonPath) {
    const content = await promises_1.default.readFile(packageJsonPath, 'utf-8');
    return JSON.parse(content);
}
/**
 * Logs the build completion time and status.
 */
function logBuildResult(logger, startTime, success) {
    const durationMs = Number(process.hrtime.bigint() - startTime) / 1_000_000;
    const durationSec = (durationMs / 1000).toFixed(2);
    if (success) {
        logger.info(`Build at: ${new Date().toISOString()} - Time: ${durationMs.toFixed(0)}ms`);
        logger.info(`Built Angular library in ${durationSec}s.`);
    }
    else {
        logger.error(`Build failed after ${durationSec}s.`);
    }
}
//# sourceMappingURL=builder.js.map