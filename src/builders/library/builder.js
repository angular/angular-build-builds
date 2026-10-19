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
exports.executeLibraryBuilder = executeLibraryBuilder;
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
const builder_state_1 = require("./builder-state");
const options_1 = require("./options");
const entry_points_1 = require("./pipeline/entry-points");
const utils_2 = require("./pipeline/utils");
/**
 * Executes the library builder to compile, bundle, and package an Angular library into the Angular Package Format (APF).
 *
 * @param options The raw builder schema options.
 * @param context The architect builder execution context.
 * @returns An async iterator yielding builder output results.
 */
async function* executeLibraryBuilder(options, context) {
    (0, version_1.assertCompatibleAngularVersion)(context.workspaceRoot);
    const projectName = context.target?.project;
    if (!projectName) {
        yield { success: false, error: 'The library builder requires a target.' };
        return;
    }
    const [normalizedOptions] = await Promise.all([
        (0, options_1.normalizeLibraryOptions)(context, projectName, options),
        (0, hash_1.initializeHash)(),
        // Purge old build disk cache
        (0, purge_cache_1.purgeStaleBuildCache)(context),
    ]);
    const { workspaceRoot, projectRoot, outputPath, deleteOutputPath, watch: isWatchMode, poll, cacheOptions, preserveSymlinks, progress, } = normalizedOptions;
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
    const [{ buildAction }, { createComponentStylesheetBundlerForLibrary }] = await Promise.all([
        Promise.resolve().then(() => __importStar(require('./pipeline/build-action'))),
        Promise.resolve().then(() => __importStar(require('./pipeline/stylesheet-bundler'))),
    ]);
    let stylesheetBundler;
    let watcher;
    const buildState = new builder_state_1.BuilderState(normalizedOptions);
    try {
        const browsers = (0, supported_browsers_1.getSupportedBrowsers)(projectRoot, logger);
        const target = (0, target_1.transformSupportedBrowsersToTargets)(browsers);
        stylesheetBundler = createComponentStylesheetBundlerForLibrary(normalizedOptions, isWatchMode, target);
        if (isWatchMode) {
            const { setupWatcher } = await Promise.resolve().then(() => __importStar(require('../../utils/watcher')));
            watcher = await setupWatcher({
                workspaceRoot,
                projectRoot,
                outputPath,
                cacheOptions,
                poll,
                preserveSymlinks,
                signal,
                watchFiles: [
                    ...buildState.watchedCompilationFiles,
                    ...normalizedOptions.assets.map((asset) => asset.input),
                ],
            });
            context.addTeardown?.(() => void watcher?.close());
        }
        // Execute initial build
        const initialResult = await executeBuild('Building...', {
            options: normalizedOptions,
            stylesheetBundler,
            isWatchMode,
            buildState,
        }, logger, withProgress, watcher, buildAction);
        if (isWatchMode && progress) {
            logger.info('Watch mode enabled. Watching for file changes...');
        }
        yield initialResult;
        if (!isWatchMode || !watcher) {
            return;
        }
        yield* runWatchLoop(watcher, normalizedOptions, stylesheetBundler, logger, withProgress, buildState, buildAction, signal);
    }
    finally {
        (0, profiling_1.logCumulativeDurations)();
        (0, sass_language_1.shutdownSassWorkerPool)();
        await Promise.allSettled([
            watcher?.close(),
            stylesheetBundler?.dispose(),
            buildState.dispose(),
        ]);
    }
}
/**
 * Executes a single build iteration with progress reporting, logs any resulting
 * messages, and registers newly discovered files with the watcher.
 *
 * @param message Progress spinner message to display while building.
 * @param actionContext The build action context and state.
 * @param logger The Architect logger API.
 * @param withProgress Progress wrapper function (`withSpinner` or `withNoProgress`).
 * @param watcher Optional file watcher for watch mode.
 * @param buildAction The library build action function to execute.
 * @returns A promise resolving to the Architect `BuilderOutput`.
 */
async function executeBuild(message, actionContext, logger, withProgress, watcher, buildAction) {
    const startTime = process.hrtime.bigint();
    const { buildState, isWatchMode, options } = actionContext;
    try {
        const result = await withProgress(message, () => buildAction(actionContext));
        logMessages(logger, result);
        const { output } = result;
        logBuildResult(logger, startTime, output.success, options.outputPath);
        if (output.success && isWatchMode) {
            (0, profiling_1.logCumulativeDurations)();
        }
        return output;
    }
    catch (error) {
        (0, error_1.assertIsError)(error);
        logBuildResult(logger, startTime, false);
        return { success: false, error: error.message };
    }
    finally {
        if (watcher) {
            watcher.add(Array.from(buildState.watchedCompilationFiles));
        }
    }
}
/**
 * Runs the watch loop, rebuilding the library as watched files are modified.
 *
 * @param watcher The file watcher instance.
 * @param options The normalized library builder options with POSIX paths.
 * @param stylesheetBundler The component stylesheet bundler instance.
 * @param logger The Architect logger API.
 * @param withProgress Progress wrapper function (`withSpinner` or `withNoProgress`).
 * @param buildState The state preserved across incremental builds.
 * @param buildAction The library build action function to execute.
 * @param signal Abort signal to terminate the watch loop.
 * @returns An async iterator yielding builder output results.
 */
async function* runWatchLoop(watcher, options, stylesheetBundler, logger, withProgress, buildState, buildAction, signal) {
    const { packageJsonPath, clearScreen } = options;
    for await (const changes of watcher) {
        if (signal.aborted) {
            break;
        }
        if (clearScreen) {
            // eslint-disable-next-line no-console
            console.clear();
        }
        const rawChangedFiles = changes.all.map(path_1.toPosixPath);
        stylesheetBundler.invalidate(rawChangedFiles);
        const changedFiles = buildState.getAffectedFiles(rawChangedFiles);
        for (const posixFile of changedFiles) {
            if (/\.(?:scss|sass)$/i.test(posixFile)) {
                (0, sass_language_1.resetSassWorkerPoolCaches)();
                break;
            }
        }
        // Check if package.json was modified
        if (changedFiles.has(packageJsonPath)) {
            buildState.hasEmittedManifests = false;
            try {
                const packageJson = await (0, utils_2.loadPackageJson)(packageJsonPath);
                (0, entry_points_1.updateWatchedEntryPoints)(packageJson, options, buildState);
            }
            catch (error) {
                (0, error_1.assertIsError)(error);
                await buildState.singleProgramCache?.compilationInstance.update?.(changedFiles);
                if (buildState.shouldCompileEntryPoints(packageJsonPath, changedFiles)) {
                    buildState.hasCompilationError = true;
                }
                yield {
                    success: false,
                    error: `Failed to reload 'package.json': ${error.message}`,
                };
                continue;
            }
        }
        const hasSourceChanges = buildState.shouldCompileEntryPoints(packageJsonPath, changedFiles);
        if (!hasSourceChanges) {
            await buildState.singleProgramCache?.compilationInstance.update?.(changedFiles);
        }
        const collectedAssets = await buildState.collectAssets(options, changedFiles);
        if (!hasSourceChanges &&
            buildState.hasEmittedManifests &&
            collectedAssets.filesToEmit.length === 0 &&
            collectedAssets.filesToDelete.length === 0) {
            continue;
        }
        yield await executeBuild('Changes detected. Rebuilding...', {
            options,
            stylesheetBundler,
            isWatchMode: true,
            buildState,
            modifiedFiles: changedFiles,
            collectedAssets,
        }, logger, withProgress, watcher, buildAction);
    }
}
/**
 * Logs informational, warning, and error messages produced during a build iteration.
 *
 * @param logger The Architect logger API.
 * @param result The build execution result containing logs, warnings, and errors.
 */
function logMessages(logger, { logs, warnings, errors }) {
    if (logs.length) {
        logger.info(logs.join('\n'));
    }
    if (warnings.length) {
        logger.warn(warnings.join('\n'));
    }
    if (errors.length) {
        logger.error(errors.join('\n'));
    }
}
/**
 * Logs the build completion time and status.
 *
 * @param logger The Architect logger API.
 * @param startTime High-resolution timestamp recorded when the build iteration started.
 * @param success Whether the build iteration succeeded without errors.
 * @param outputPath Optional POSIX output directory path to log on successful builds.
 */
function logBuildResult(logger, startTime, success, outputPath) {
    const buildTime = Number(process.hrtime.bigint() - startTime) / 10 ** 9;
    const message = `Library bundle generation ${success ? 'complete' : 'failed'}.` +
        ` [${buildTime.toFixed(3)} seconds] - ${new Date().toISOString()}`;
    if (success) {
        logger.info(message);
        if (outputPath) {
            logger.info(`Output location: ${outputPath}\n`);
        }
    }
    else {
        logger.error(message);
    }
}
//# sourceMappingURL=builder.js.map