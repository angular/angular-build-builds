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
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const utils_1 = require("../../../tools/esbuild/utils");
const path_1 = require("../../../utils/path");
const assets_1 = require("./assets");
const bundler_1 = require("./bundler");
const compilation_1 = require("./compilation");
const package_manifests_1 = require("./package-manifests");
/**
 * Creates a fresh {@link SingleBuildState} instance.
 */
function createSingleBuildState() {
    return {
        previousBundleResults: new Map(),
        pendingChangedEsmFiles: new Set(),
        pendingChangedDtsFiles: new Set(),
        directoryExists: new Set(),
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
    const { options, context, stylesheetBundler, isWatchMode, allWatchedFiles, buildState, modifiedFiles, } = actionContext;
    const posixPackageJsonPath = (0, path_1.toPosixPath)(options.packageJsonPath);
    const { pendingChangedEsmFiles, pendingChangedDtsFiles, directoryExists } = buildState;
    if (!modifiedFiles || modifiedFiles.has(posixPackageJsonPath)) {
        buildState.hasEmittedManifests = false;
    }
    const shouldCompileEntryPoints = !modifiedFiles ||
        !buildState.singleProgramCache ||
        Boolean(buildState.hasCompilationError) ||
        pendingChangedEsmFiles.size > 0 ||
        pendingChangedDtsFiles.size > 0 ||
        hasModifiedWatchedFile(modifiedFiles, allWatchedFiles, posixPackageJsonPath);
    const shouldGenerateManifests = !buildState.hasEmittedManifests;
    if (shouldGenerateManifests) {
        verifyAllowedDependencies(options);
    }
    const filesToEmit = [];
    if (shouldCompileEntryPoints) {
        buildState.hasCompilationError = true;
        const { esmFiles, dtsFiles, changedEsmFiles, changedDtsFiles, referencedFiles, cache, diagnosePromise, } = await (0, compilation_1.compileLibrary)(options.entryPoints.values(), options, stylesheetBundler, buildState.singleProgramCache, modifiedFiles);
        buildState.singleProgramCache = cache;
        for (const file of referencedFiles) {
            allWatchedFiles.add(file);
        }
        for (const file of changedEsmFiles) {
            pendingChangedEsmFiles.add(file);
        }
        for (const file of changedDtsFiles) {
            pendingChangedDtsFiles.add(file);
        }
        const itemsToBundle = [];
        for (const entryPoint of options.entryPoints.values()) {
            const previousBundleResult = buildState.previousBundleResults.get(entryPoint.name);
            const hasEsmChanges = !previousBundleResult ||
                hasEntryPointChanges(previousBundleResult.esmModuleIds, pendingChangedEsmFiles);
            const hasDtsChanges = !previousBundleResult ||
                hasEntryPointChanges(previousBundleResult.dtsModuleIds, pendingChangedDtsFiles);
            if (hasEsmChanges || hasDtsChanges) {
                context.logger.info(`Compiling ${entryPoint.displayName}...`);
                itemsToBundle.push({
                    entryPoint,
                    hasEsmChanges,
                    hasDtsChanges,
                    previousBundleResult,
                });
            }
        }
        let bundleOutput;
        let warnings;
        try {
            [bundleOutput, warnings] = await Promise.all([
                (0, bundler_1.bundleEntryPoints)(itemsToBundle, esmFiles, dtsFiles, options),
                diagnosePromise,
            ]);
        }
        catch (error) {
            // Prioritize TypeScript/Angular diagnostic errors over secondary bundler failures.
            await diagnosePromise;
            throw error;
        }
        buildState.hasCompilationError = false;
        pendingChangedEsmFiles.clear();
        pendingChangedDtsFiles.clear();
        for (const warning of warnings) {
            context.logger.warn(warning);
        }
        filesToEmit.push(...bundleOutput.filesToEmit);
        for (const [name, bundleResult] of bundleOutput.bundleResults) {
            buildState.previousBundleResults.set(name, bundleResult);
        }
    }
    if (shouldGenerateManifests) {
        filesToEmit.push(...(0, package_manifests_1.generatePackageManifests)(options, isWatchMode));
    }
    filesToEmit.push(...(await (0, assets_1.collectAssetsToEmit)(options.assets, options.workspaceRoot, allWatchedFiles, buildState.hasEmittedAssets ? modifiedFiles : undefined)));
    await (0, utils_1.emitFilesToDisk)(filesToEmit, async (file) => {
        const fullFilePath = node_path_1.default.join(options.outputPath, file.path);
        const fileBasePath = node_path_1.default.dirname(fullFilePath);
        if (fileBasePath && !directoryExists.has(fileBasePath)) {
            await (0, promises_1.mkdir)(fileBasePath, { recursive: true });
            directoryExists.add(fileBasePath);
        }
        if (file.type === 'memory') {
            await (0, promises_1.writeFile)(fullFilePath, file.contents);
        }
        else {
            await (0, promises_1.copyFile)(file.source, fullFilePath, promises_1.constants.COPYFILE_FICLONE);
        }
    });
    buildState.hasEmittedManifests = true;
    buildState.hasEmittedAssets = true;
}
function hasModifiedWatchedFile(modifiedFiles, allWatchedFiles, posixPackageJsonPath) {
    for (const file of modifiedFiles) {
        if (file !== posixPackageJsonPath && allWatchedFiles.has(file)) {
            return true;
        }
    }
    return false;
}
function hasEntryPointChanges(moduleIds, changedFiles) {
    if (changedFiles.size === 0) {
        return false;
    }
    for (const file of changedFiles) {
        if (moduleIds.has(file)) {
            return true;
        }
    }
    return false;
}
function verifyAllowedDependencies(options) {
    const { packageJson, allowedNonPeerDependencies } = options;
    const dependencies = {
        ...(packageJson.dependencies ?? {}),
        ...(packageJson.optionalDependencies ?? {}),
    };
    for (const dep of Object.keys(dependencies)) {
        if (!allowedNonPeerDependencies.some((regex) => regex.test(dep))) {
            throw new Error(`Dependency '${dep}' must be explicitly allowed using the 'allowedNonPeerDependencies' option, ` +
                `or moved to 'peerDependencies' in 'package.json'.`);
        }
    }
}
//# sourceMappingURL=build-action.js.map