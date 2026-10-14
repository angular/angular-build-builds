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
exports.createSingleBuildState = createSingleBuildState;
exports.buildAction = buildAction;
exports.hasModifiedWatchedFile = hasModifiedWatchedFile;
const node_path_1 = __importDefault(require("node:path"));
const emit_files_to_disk_1 = require("../../../utils/emit-files-to-disk");
const error_1 = require("../../../utils/error");
const path_1 = require("../../../utils/path");
const assets_1 = require("./assets");
const bundler_1 = require("./bundler");
const compilation_1 = require("./compilation");
const entry_points_1 = require("./entry-points");
const package_manifests_1 = require("./package-manifests");
/**
 * Creates a fresh {@link SingleBuildState} instance.
 */
function createSingleBuildState() {
    return {
        previousBundleResults: new Map(),
        pendingChangedEsmFiles: new Set(),
        pendingChangedDtsFiles: new Set(),
    };
}
/**
 * Executes a single iteration of the library build pipeline, including
 * single-program Angular compilation, parallel typechecking, 2-instance Rolldown bundling,
 * manifest generation, and asset copying.
 *
 * @param actionContext The build action state and configuration.
 */
async function buildAction(actionContext) {
    const { options, stylesheetBundler, isWatchMode, watchedCompilationFiles, buildState, modifiedFiles, } = actionContext;
    const errors = [];
    const warnings = [];
    const logs = [];
    const posixPackageJsonPath = (0, path_1.toPosixPath)(options.packageJsonPath);
    const { pendingChangedEsmFiles, pendingChangedDtsFiles } = buildState;
    if (!modifiedFiles || modifiedFiles.has(posixPackageJsonPath)) {
        buildState.hasEmittedManifests = false;
    }
    const shouldCompileEntryPoints = !modifiedFiles ||
        !buildState.singleProgramCache ||
        buildState.hasCompilationError ||
        buildState.hasEntryPointsChanges ||
        pendingChangedEsmFiles.size > 0 ||
        pendingChangedDtsFiles.size > 0 ||
        hasModifiedWatchedFile(modifiedFiles, watchedCompilationFiles, posixPackageJsonPath);
    try {
        if (!buildState.hasEmittedManifests) {
            const dependencyErrors = verifyAllowedDependencies(options);
            if (dependencyErrors.length > 0) {
                errors.push(...dependencyErrors);
                return { errors, warnings, logs };
            }
        }
        const filesToEmit = [];
        if (shouldCompileEntryPoints) {
            buildState.hasCompilationError = true;
            buildState.hasEntryPointsChanges = false;
            const { esmFiles, dtsFiles, changedEsmFiles, changedDtsFiles, referencedFiles, cache, hasStylesheetErrors, diagnosePromise, declarationMap, compilationMode, } = await (0, compilation_1.compileLibrary)(options.entryPoints.values(), options, stylesheetBundler, buildState.singleProgramCache, modifiedFiles);
            buildState.singleProgramCache = cache;
            if (buildState.compilationMode !== compilationMode) {
                buildState.compilationMode = compilationMode;
                buildState.hasEmittedManifests = false;
            }
            for (const file of referencedFiles) {
                watchedCompilationFiles.add(file);
            }
            for (const file of changedEsmFiles) {
                pendingChangedEsmFiles.add(file);
            }
            for (const file of changedDtsFiles) {
                pendingChangedDtsFiles.add(file);
            }
            const itemsToBundle = (0, entry_points_1.collectEntryPointsToBundle)(options, buildState, logs);
            let bundleOutput;
            let diagnostics;
            if (hasStylesheetErrors) {
                diagnostics = await diagnosePromise;
            }
            else {
                try {
                    [bundleOutput, diagnostics] = await Promise.all([
                        (0, bundler_1.bundleEntryPoints)(itemsToBundle, esmFiles, dtsFiles, {
                            ...options,
                            declarationMap,
                            compilationMode,
                        }),
                        diagnosePromise,
                    ]);
                }
                catch (error) {
                    (0, error_1.assertIsError)(error);
                    // Prioritize TypeScript/Angular diagnostic errors over secondary bundler failures.
                    diagnostics = await diagnosePromise;
                    if (diagnostics.errors.length === 0) {
                        errors.push(error.message);
                    }
                }
            }
            warnings.push(...diagnostics.warnings, ...(bundleOutput?.warnings ?? []));
            if (diagnostics.errors.length > 0 || errors.length > 0 || !bundleOutput) {
                errors.push(...diagnostics.errors);
                return { errors, warnings, logs };
            }
            buildState.hasCompilationError = false;
            pendingChangedEsmFiles.clear();
            pendingChangedDtsFiles.clear();
            filesToEmit.push(...bundleOutput.filesToEmit);
            for (const [name, bundleResult] of bundleOutput.bundleResults) {
                buildState.previousBundleResults.set(name, bundleResult);
            }
        }
        let hasTslibImport = false;
        for (const entryPoint of options.entryPoints.values()) {
            if (buildState.previousBundleResults.get(entryPoint.name)?.hasTslibImport) {
                hasTslibImport = true;
                break;
            }
        }
        if (!buildState.hasEmittedManifests || buildState.hasEmittedTslib !== hasTslibImport) {
            filesToEmit.push(...(await (0, package_manifests_1.generatePackageManifests)({
                ...options,
                compilationMode: buildState.compilationMode ?? options.compilationMode ?? 'partial',
            }, isWatchMode, hasTslibImport)));
        }
        const resolvedAssetsToEmit = (actionContext.assetsToEmit ??= await (0, assets_1.collectAssetsToEmit)(options.assets, options.workspaceRoot, buildState.hasEmittedAssets ? modifiedFiles : undefined));
        filesToEmit.push(...resolvedAssetsToEmit);
        await (0, emit_files_to_disk_1.emitFilesToDisk)(filesToEmit, (file) => node_path_1.default.join(options.outputPath, file.path));
        buildState.hasEmittedManifests = true;
        buildState.hasEmittedTslib = hasTslibImport;
        buildState.hasEmittedAssets = true;
    }
    catch (error) {
        (0, error_1.assertIsError)(error);
        errors.push(error.message);
    }
    return { errors, warnings, logs };
}
/**
 * Checks whether any modified file (excluding `package.json`) is part of the
 * tracked compilation file set.
 *
 * @param modifiedFiles Set of POSIX file paths modified since the last build.
 * @param watchedCompilationFiles Set of POSIX file paths tracked for compilation.
 * @param posixPackageJsonPath The normalized POSIX path to the library's `package.json`.
 * @returns `true` if a watched compilation file was modified; otherwise `false`.
 */
function hasModifiedWatchedFile(modifiedFiles, watchedCompilationFiles, posixPackageJsonPath) {
    for (const file of modifiedFiles) {
        if (file !== posixPackageJsonPath && watchedCompilationFiles.has(file)) {
            return true;
        }
    }
    return false;
}
/**
 * Validates that all direct and optional dependencies in `package.json` are
 * permitted by `allowedNonPeerDependencies`.
 *
 * @param options The normalized library builder options.
 * @returns An array of error messages for any disallowed dependencies.
 */
function verifyAllowedDependencies(options) {
    const { packageJson, allowedNonPeerDependencies } = options;
    const dependencies = {
        ...(packageJson.dependencies ?? {}),
        ...(packageJson.optionalDependencies ?? {}),
    };
    const errors = [];
    for (const dep of Object.keys(dependencies)) {
        if (!allowedNonPeerDependencies.some((regex) => regex.test(dep))) {
            errors.push(`Dependency '${dep}' must be explicitly allowed using the 'allowedNonPeerDependencies' option, ` +
                `or moved to 'peerDependencies' in 'package.json'.`);
        }
    }
    return errors;
}
//# sourceMappingURL=build-action.js.map