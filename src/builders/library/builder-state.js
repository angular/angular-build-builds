"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuilderState = void 0;
const path_1 = require("../../utils/path");
const execution_result_1 = require("./execution-result");
const assets_1 = require("./pipeline/assets");
/**
 * Encapsulates incremental compilation state, transitive resource reference tracking,
 * asset matchers, and emitted output file tracking across watch-mode rebuilds.
 */
class BuilderState {
    #referencingFiles = new Map();
    #referencedByFile = new Map();
    #watchedCompilationFiles = new Set();
    #pendingCompilationFiles = new Set();
    #pendingAssetFiles = new Set();
    #assetMatchers;
    #emittedBundleFiles = new Set();
    #emittedManifestFiles = new Set();
    #emittedAssets = new Map();
    #hasEmittedAssets = false;
    #executionResult = new execution_result_1.ExecutionResult();
    #hasUpdatedBundles = false;
    #singleProgramCache;
    #compilationMode;
    #hasEmittedTslib = false;
    /** Map of entry point names to their previous bundle results. */
    previousBundleResults = new Map();
    /** Set of changed POSIX ESM file paths pending bundling. */
    pendingChangedEsmFiles = new Set();
    /** Set of changed POSIX TypeScript declaration file paths pending bundling. */
    pendingChangedDtsFiles = new Set();
    /** Whether the previous build iteration encountered a compilation or diagnostic error. */
    hasCompilationError = false;
    /** Whether package.json and secondary entry point manifests have been emitted. */
    hasEmittedManifests = false;
    /** Whether entry points in package.json changed since the last compilation. */
    hasEntryPointsChanges = false;
    constructor(options) {
        if (options?.tsConfigPath) {
            this.#watchedCompilationFiles.add(options.tsConfigPath);
        }
        if (options?.packageJsonPath) {
            this.#watchedCompilationFiles.add(options.packageJsonPath);
        }
        if (options?.entryPoints) {
            for (const entryPoint of options.entryPoints.values()) {
                this.#watchedCompilationFiles.add(entryPoint.entryFilePath);
            }
        }
    }
    /** Cached unified TypeScript and Angular compilation state. */
    get singleProgramCache() {
        return this.#singleProgramCache;
    }
    /** Effective compilation mode resolved from builder options and tsconfig. */
    get compilationMode() {
        return this.#compilationMode;
    }
    /** Whether the last emitted root package.json included a tslib dependency. */
    get hasEmittedTslib() {
        return this.#hasEmittedTslib;
    }
    /** Whether any active entry point bundle imports `tslib`. */
    get hasTslibImport() {
        for (const result of this.previousBundleResults.values()) {
            if (result.hasTslibImport) {
                return true;
            }
        }
        return false;
    }
    /**
     * Set of POSIX file paths tracked for compilation and configuration
     * (including `tsconfig.json`, `package.json`, entry points, and referenced source,
     * template, and stylesheet files).
     */
    get watchedCompilationFiles() {
        return this.#watchedCompilationFiles;
    }
    /**
     * Execution result holding errors, warnings, and logs for the current build iteration.
     */
    get executionResult() {
        return this.#executionResult;
    }
    /**
     * Resets the execution result and staged output state for a new build iteration.
     *
     * @returns The fresh `ExecutionResult` instance for the current build iteration.
     */
    resetExecutionResult() {
        this.#executionResult = new execution_result_1.ExecutionResult();
        this.#hasUpdatedBundles = false;
        return this.#executionResult;
    }
    /**
     * Records transitive resource dependencies (such as Sass partials) for a containing
     * component or stylesheet file and registers them in `watchedCompilationFiles`.
     * Multiple calls for the same containing file accumulate references additively.
     *
     * @param containingFile Path of the referencing component or stylesheet file.
     * @param referencedFiles Paths of the referenced files.
     */
    addFileReferences(containingFile, referencedFiles) {
        const posixContainingFile = (0, path_1.toPosixPath)(containingFile);
        let forwardReferences = this.#referencedByFile.get(posixContainingFile);
        for (const file of referencedFiles) {
            const posixFile = (0, path_1.toPosixPath)(file);
            this.#watchedCompilationFiles.add(posixFile);
            if (posixFile === posixContainingFile) {
                continue;
            }
            if (!forwardReferences) {
                forwardReferences = new Set();
                this.#referencedByFile.set(posixContainingFile, forwardReferences);
            }
            forwardReferences.add(posixFile);
            let referencing = this.#referencingFiles.get(posixFile);
            if (!referencing) {
                referencing = new Set();
                this.#referencingFiles.set(posixFile, referencing);
            }
            referencing.add(posixContainingFile);
        }
    }
    /**
     * Clears previously recorded outgoing resource references for the given containing files
     * before they are recompiled.
     *
     * @param containingFiles Paths of the containing or stylesheet files being recompiled.
     */
    clearFileReferences(containingFiles) {
        for (const containingFile of containingFiles) {
            const posixContainingFile = (0, path_1.toPosixPath)(containingFile);
            const forwardReferences = this.#referencedByFile.get(posixContainingFile);
            if (!forwardReferences) {
                continue;
            }
            for (const prevRef of forwardReferences) {
                const referencing = this.#referencingFiles.get(prevRef);
                if (referencing) {
                    referencing.delete(posixContainingFile);
                    if (referencing.size === 0) {
                        this.#referencingFiles.delete(prevRef);
                    }
                }
            }
            this.#referencedByFile.delete(posixContainingFile);
        }
    }
    /**
     * Returns the set of all files affected by the given changed files, including the
     * changed files themselves and all transitively referencing files
     * (e.g., partial `.scss` -> component `.scss` -> component `.ts`).
     *
     * @param files Initial changed file paths.
     * @returns Set of POSIX paths including all transitively referencing files.
     */
    getAffectedFiles(files) {
        const affected = new Set();
        for (const file of files) {
            affected.add((0, path_1.toPosixPath)(file));
        }
        for (const file of affected) {
            const referencing = this.#referencingFiles.get(file);
            if (referencing) {
                for (const refFile of referencing) {
                    affected.add(refFile);
                }
            }
        }
        return affected;
    }
    /**
     * Determines whether compilation and bundling need to run for the current build iteration.
     * Also records incoming modified files so they are retained if the iteration aborts early.
     *
     * @param packageJsonPath Normalized POSIX path to the library's `package.json`.
     * @param modifiedFiles Optional set of modified POSIX file paths in watch mode.
     * @returns `true` if entry points should be compiled; otherwise `false`.
     */
    shouldCompileEntryPoints(packageJsonPath, modifiedFiles) {
        if (modifiedFiles) {
            for (const file of modifiedFiles) {
                if (file !== packageJsonPath) {
                    this.#pendingCompilationFiles.add(file);
                }
                if (this.#hasEmittedAssets) {
                    this.#pendingAssetFiles.add(file);
                }
            }
        }
        if (!modifiedFiles ||
            !this.#singleProgramCache ||
            this.hasCompilationError ||
            this.hasEntryPointsChanges ||
            this.pendingChangedEsmFiles.size > 0 ||
            this.pendingChangedDtsFiles.size > 0) {
            return true;
        }
        for (const file of this.#pendingCompilationFiles) {
            if (this.#watchedCompilationFiles.has(file)) {
                return true;
            }
        }
        this.#pendingCompilationFiles.clear();
        return false;
    }
    /**
     * Returns the effective set of modified POSIX file paths for compilation,
     * merging any pending compilation files from earlier aborted iterations.
     *
     * @param modifiedFiles Optional set of modified POSIX file paths from the current iteration.
     * @returns Merged set of modified POSIX file paths, or `undefined` for a full compilation.
     */
    getCompilationModifiedFiles(modifiedFiles) {
        if (!modifiedFiles) {
            this.#pendingCompilationFiles.clear();
            return undefined;
        }
        const files = new Set(modifiedFiles);
        for (const file of this.#pendingCompilationFiles) {
            files.add(file);
        }
        return files;
    }
    /**
     * Records compilation output into the build state, updating the program cache,
     * watched compilation files, and pending changed ESM/DTS file sets.
     *
     * @param output The compilation output produced by `compileLibrary`.
     */
    recordCompilationOutput(output) {
        this.#pendingCompilationFiles.clear();
        this.#singleProgramCache = output.cache;
        if (this.#compilationMode !== output.compilationMode) {
            this.#compilationMode = output.compilationMode;
            this.hasEmittedManifests = false;
        }
        for (const file of output.referencedFiles) {
            this.#watchedCompilationFiles.add(file);
        }
        for (const file of output.changedEsmFiles) {
            this.pendingChangedEsmFiles.add(file);
        }
        for (const file of output.changedDtsFiles) {
            this.pendingChangedDtsFiles.add(file);
        }
    }
    /**
     * Records active bundle results across entry points after compilation and bundling succeed
     * and clears pending compilation/bundle flags.
     *
     * @param bundleResults Newly bundled results keyed by entry point name.
     */
    recordBundleOutput(bundleResults) {
        const hadEntryPointsChanges = this.hasEntryPointsChanges;
        this.hasCompilationError = false;
        this.hasEntryPointsChanges = false;
        this.pendingChangedEsmFiles.clear();
        this.pendingChangedDtsFiles.clear();
        for (const [name, bundleResult] of bundleResults) {
            this.previousBundleResults.set(name, bundleResult);
        }
        if (bundleResults.size > 0 || hadEntryPointsChanges || this.#emittedBundleFiles.size === 0) {
            this.#hasUpdatedBundles = true;
        }
    }
    /**
     * Resolves and collects configured library assets to be emitted to or deleted from disk.
     *
     * @param options Normalized library options containing `assets` and `workspaceRoot`.
     * @param modifiedFiles Optional set of modified POSIX file paths in watch mode.
     * @returns The collected asset files to emit and delete.
     */
    collectAssets(options, modifiedFiles) {
        let effectiveModifiedFiles;
        if (this.#hasEmittedAssets && modifiedFiles) {
            for (const file of modifiedFiles) {
                this.#pendingAssetFiles.add(file);
            }
            effectiveModifiedFiles = this.#pendingAssetFiles;
        }
        if (effectiveModifiedFiles?.size && options.assets.length > 0) {
            this.#assetMatchers ??= (0, assets_1.createAssetMatchers)(options.assets);
        }
        return (0, assets_1.collectAssetsToEmit)(options.assets, options.workspaceRoot, this.#emittedAssets, effectiveModifiedFiles, this.#assetMatchers);
    }
    /**
     * Records emitted bundle, manifest, and asset output files after disk emission,
     * returning any stale or deleted output paths to remove from disk.
     *
     * @param collectedAssets Collected asset files emitted and deleted in this iteration.
     * @param manifestFiles Optional manifest output files generated in this iteration.
     * @returns Read-only set of relative POSIX output paths to delete from disk.
     */
    recordEmittedOutputs(collectedAssets, manifestFiles) {
        const filesToDelete = new Set();
        if (this.#hasUpdatedBundles) {
            this.#hasUpdatedBundles = false;
            const nextBundleFiles = new Set();
            for (const result of this.previousBundleResults.values()) {
                for (const file of result.esmOutputFiles) {
                    nextBundleFiles.add(file);
                }
                for (const file of result.dtsOutputFiles) {
                    nextBundleFiles.add(file);
                }
            }
            for (const prevFile of this.#emittedBundleFiles) {
                if (!nextBundleFiles.has(prevFile)) {
                    filesToDelete.add(prevFile);
                }
            }
            this.#emittedBundleFiles = nextBundleFiles;
        }
        if (manifestFiles) {
            const nextManifestFiles = new Set(manifestFiles.map((file) => file.path));
            for (const prevFile of this.#emittedManifestFiles) {
                if (!nextManifestFiles.has(prevFile)) {
                    filesToDelete.add(prevFile);
                }
            }
            this.#emittedManifestFiles = nextManifestFiles;
        }
        const { filesToDelete: toDelete, filesToEmit: toEmit } = collectedAssets;
        for (const emittedAsset of toEmit) {
            let outputs = this.#emittedAssets.get(emittedAsset.source);
            if (outputs?.has(emittedAsset.path)) {
                continue;
            }
            if (this.#hasEmittedAssets) {
                for (const [source, prevOutputs] of this.#emittedAssets) {
                    if (prevOutputs.delete(emittedAsset.path)) {
                        if (prevOutputs.size === 0) {
                            this.#emittedAssets.delete(source);
                        }
                        break;
                    }
                }
            }
            if (!outputs) {
                outputs = new Set();
                this.#emittedAssets.set(emittedAsset.source, outputs);
            }
            outputs.add(emittedAsset.path);
        }
        for (const source of toDelete) {
            const outputs = this.#emittedAssets.get(source);
            if (outputs) {
                for (const output of outputs) {
                    filesToDelete.add(output);
                }
                this.#emittedAssets.delete(source);
            }
        }
        this.hasEmittedManifests = true;
        this.#hasEmittedTslib = this.hasTslibImport;
        this.#hasEmittedAssets = true;
        this.#pendingAssetFiles.clear();
        return filesToDelete;
    }
    /**
     * Disposes active compilation resources and clears cached state.
     */
    async dispose() {
        await this.#singleProgramCache?.compilationInstance.close?.();
        this.#singleProgramCache = undefined;
        this.#compilationMode = undefined;
        this.#assetMatchers = undefined;
        this.#hasEmittedTslib = false;
        this.#hasEmittedAssets = false;
        this.hasCompilationError = false;
        this.hasEmittedManifests = false;
        this.hasEntryPointsChanges = false;
        this.previousBundleResults.clear();
        this.pendingChangedEsmFiles.clear();
        this.pendingChangedDtsFiles.clear();
        this.#pendingCompilationFiles.clear();
        this.#pendingAssetFiles.clear();
        this.#referencingFiles.clear();
        this.#referencedByFile.clear();
        this.#watchedCompilationFiles.clear();
        this.#emittedBundleFiles.clear();
        this.#emittedManifestFiles.clear();
        this.#emittedAssets.clear();
        this.#hasUpdatedBundles = false;
    }
}
exports.BuilderState = BuilderState;
//# sourceMappingURL=builder-state.js.map