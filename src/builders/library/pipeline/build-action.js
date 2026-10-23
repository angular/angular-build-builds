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
exports.buildAction = buildAction;
const node_path_1 = __importDefault(require("node:path"));
const disk_files_1 = require("../../../utils/disk-files");
const error_1 = require("../../../utils/error");
const bundler_1 = require("./bundler");
const compilation_1 = require("./compilation");
const entry_points_1 = require("./entry-points");
const package_manifests_1 = require("./package-manifests");
/**
 * Executes a single iteration of the library build pipeline, including
 * single-program Angular compilation, parallel typechecking, 2-instance Rolldown bundling,
 * manifest generation, and asset copying.
 *
 * @param actionContext The build action state and configuration.
 * @returns A promise resolving to the build iteration's `ExecutionResult`.
 */
async function buildAction(actionContext) {
    const { options, stylesheetBundler, isWatchMode, buildState, modifiedFiles } = actionContext;
    const result = buildState.resetExecutionResult();
    const { packageJsonPath } = options;
    const shouldCompileEntryPoints = buildState.shouldCompileEntryPoints(packageJsonPath, modifiedFiles);
    try {
        if (!buildState.hasEmittedManifests && !verifyAllowedDependencies(options, result)) {
            return result;
        }
        const filesToEmit = [];
        if (shouldCompileEntryPoints) {
            buildState.hasCompilationError = true;
            const compilationOutput = await (0, compilation_1.compileLibrary)(options, stylesheetBundler, buildState, buildState.getCompilationModifiedFiles(modifiedFiles));
            buildState.recordCompilationOutput(compilationOutput);
            const { esmFiles, dtsFiles, hasStylesheetErrors, diagnosePromise, declarationMap, compilationMode, } = compilationOutput;
            if (hasStylesheetErrors) {
                await diagnosePromise;
                return result;
            }
            const itemsToBundle = (0, entry_points_1.collectEntryPointsToBundle)(options, buildState);
            let bundleOutput;
            try {
                [bundleOutput] = await Promise.all([
                    (0, bundler_1.bundleEntryPoints)(itemsToBundle, esmFiles, dtsFiles, {
                        ...options,
                        declarationMap,
                        compilationMode,
                    }, buildState.previousBundleResults),
                    diagnosePromise,
                ]);
            }
            catch (error) {
                (0, error_1.assertIsError)(error);
                // Prioritize TypeScript/Angular diagnostic errors over secondary bundler failures.
                await diagnosePromise;
                if (!result.hasErrors) {
                    result.addError(error.message);
                }
                return result;
            }
            result.addWarnings(bundleOutput.warnings);
            if (result.hasErrors) {
                return result;
            }
            filesToEmit.push(...bundleOutput.filesToEmit);
            buildState.recordBundleOutput(bundleOutput.bundleResults);
        }
        let manifestFiles;
        const { hasTslibImport } = buildState;
        if (!buildState.hasEmittedManifests || buildState.hasEmittedTslib !== hasTslibImport) {
            manifestFiles = await (0, package_manifests_1.generatePackageManifests)({
                ...options,
                compilationMode: buildState.compilationMode ?? options.compilationMode ?? 'partial',
            }, isWatchMode, hasTslibImport);
            filesToEmit.push(...manifestFiles);
        }
        const collectedAssets = actionContext.collectedAssets ?? (await buildState.collectAssets(options, modifiedFiles));
        filesToEmit.push(...collectedAssets.filesToEmit);
        await (0, disk_files_1.emitFilesToDisk)(filesToEmit, (file) => node_path_1.default.posix.join(options.outputPath, file.path));
        const filesToDelete = buildState.recordEmittedOutputs(collectedAssets, manifestFiles);
        if (filesToDelete.size) {
            await (0, disk_files_1.deleteFilesFromDisk)(Array.from(filesToDelete, (file) => node_path_1.default.posix.join(options.outputPath, file)));
        }
    }
    catch (error) {
        (0, error_1.assertIsError)(error);
        result.addError(error.message);
    }
    return result;
}
/**
 * Validates that all direct and optional dependencies in `package.json` are
 * permitted by `allowedNonPeerDependencies`.
 *
 * @param options The normalized library builder options.
 * @param result The execution result to record any disallowed dependency errors into.
 * @returns `true` if all dependencies are allowed; otherwise `false`.
 */
function verifyAllowedDependencies(options, result) {
    const { packageJson, allowedNonPeerDependencies } = options;
    const dependencies = {
        ...(packageJson.dependencies ?? {}),
        ...(packageJson.optionalDependencies ?? {}),
    };
    let isValid = true;
    for (const dep of Object.keys(dependencies)) {
        if (!allowedNonPeerDependencies.some((regex) => regex.test(dep))) {
            result.addError(`Dependency '${dep}' must be explicitly allowed using the 'allowedNonPeerDependencies' option, ` +
                `or moved to 'peerDependencies' in 'package.json'.`);
            isValid = false;
        }
    }
    return isValid;
}
//# sourceMappingURL=build-action.js.map