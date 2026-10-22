"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.compileLibrary = compileLibrary;
const esbuild_1 = require("esbuild");
const promises_1 = require("node:fs/promises");
const compilation_1 = require("../../../tools/angular/compilation");
const environment_options_1 = require("../../../utils/environment-options");
const error_1 = require("../../../utils/error");
const path_1 = require("../../../utils/path");
const utils_1 = require("./utils");
const EMITTED_EXTENSIONS = ['.js', '.mjs', '.cjs', '.d.ts', '.d.mts', '.d.cts'];
/**
 * Compiles all library entry points in a single TypeScript and Angular compilation pass.
 *
 * @param options The normalized library builder options with POSIX paths.
 * @param stylesheetBundler The component stylesheet bundler instance.
 * @param buildState The build state tracking compilation caches, file references, and diagnostics.
 * @param modifiedFiles Optional set of modified POSIX file paths for incremental compilation.
 * @returns A promise resolving to the compilation output containing emitted files and cache state.
 */
async function compileLibrary(options, stylesheetBundler, buildState, modifiedFiles) {
    const { tsConfigPath, entryPoints, compilationMode, preserveSymlinks, colors, declarationMap, cacheOptions, } = options;
    const cached = buildState.singleProgramCache;
    const entryPathsMap = {};
    const rootFiles = [];
    for (const ep of entryPoints.values()) {
        entryPathsMap[ep.displayName] = [ep.entryFilePath];
        rootFiles.push(ep.entryFilePath);
    }
    const compilationInstance = cached?.compilationInstance ?? (await (0, compilation_1.createAngularCompilation)('aot', false));
    try {
        let effectiveModifiedFiles = modifiedFiles;
        if (cached && cached.failedFiles.size > 0) {
            stylesheetBundler.invalidate(cached.failedFiles);
            const merged = new Set(modifiedFiles);
            for (const file of cached.failedFiles) {
                merged.add(file);
            }
            effectiveModifiedFiles = merged;
        }
        if (effectiveModifiedFiles && effectiveModifiedFiles.size > 0) {
            await compilationInstance.update?.(effectiveModifiedFiles);
        }
        const stylesheetWarnings = [];
        const stylesheetErrors = [];
        const failedFiles = new Set();
        const clearedReferenceFiles = new Set();
        const clearPreviousReferencesOnce = (targetFile) => {
            if (!cached) {
                return;
            }
            const posixTarget = (0, path_1.toPosixPath)(targetFile);
            if (!clearedReferenceFiles.has(posixTarget)) {
                clearedReferenceFiles.add(posixTarget);
                buildState.clearFileReferences([posixTarget]);
            }
        };
        const hostOptions = {
            modifiedFiles: effectiveModifiedFiles,
            async transformStylesheet(data, containingFile, stylesheetFile) {
                const result = stylesheetFile
                    ? await stylesheetBundler.bundleFile(stylesheetFile)
                    : await stylesheetBundler.bundleInline(data, containingFile, containingFile.endsWith('.html') ? 'css' : undefined);
                if (result.warnings.length > 0) {
                    stylesheetWarnings.push(...result.warnings);
                }
                const referenceTarget = stylesheetFile ?? containingFile;
                if (result.errors?.length) {
                    if (result.referencedFiles) {
                        buildState.addFileReferences(referenceTarget, result.referencedFiles);
                    }
                    stylesheetErrors.push(...result.errors);
                    failedFiles.add((0, path_1.toPosixPath)(containingFile));
                    if (stylesheetFile) {
                        failedFiles.add((0, path_1.toPosixPath)(stylesheetFile));
                    }
                    return '';
                }
                clearPreviousReferencesOnce(referenceTarget);
                if (result.referencedFiles) {
                    buildState.addFileReferences(referenceTarget, result.referencedFiles);
                }
                return result.contents;
            },
            processWebWorker: () => '',
        };
        const { referencedFiles, compilerOptions, warnings: initWarnings, } = await compilationInstance.initialize(tsConfigPath, hostOptions, {
            sourcemap: true,
            preserveSymlinks,
            rootFiles,
            declarationMap,
            compilationMode,
            paths: entryPathsMap,
            cachePath: cacheOptions.enabled ? cacheOptions.path : undefined,
        }, 'library');
        if (initWarnings?.length) {
            stylesheetWarnings.unshift(...initWarnings);
        }
        const hasStylesheetErrors = stylesheetErrors.length > 0;
        const emittedFiles = hasStylesheetErrors ? [] : await compilationInstance.emitAffectedFiles();
        const diagnosePromise = runDiagnosticsAndFormat(compilationInstance, stylesheetErrors, stylesheetWarnings, colors, buildState);
        const esmFiles = cached?.esmFiles ?? new Map();
        const dtsFiles = cached?.dtsFiles ?? new Map();
        const posixReferencedFiles = new Set(referencedFiles.map(path_1.toPosixPath));
        const { changedEsmFiles, changedDtsFiles } = await updateEmittedFileCaches(emittedFiles, esmFiles, dtsFiles, posixReferencedFiles, cached ? effectiveModifiedFiles : undefined);
        return {
            esmFiles,
            dtsFiles,
            changedEsmFiles,
            changedDtsFiles,
            referencedFiles: posixReferencedFiles,
            cache: {
                compilationInstance,
                esmFiles,
                dtsFiles,
                failedFiles,
            },
            hasStylesheetErrors,
            diagnosePromise,
            declarationMap: !!compilerOptions.declarationMap,
            compilationMode: compilerOptions.compilationMode === 'full' ? 'full' : 'partial',
        };
    }
    catch (error) {
        if (!cached) {
            await compilationInstance.close?.();
        }
        throw error;
    }
}
/**
 * Updates the in-memory ESM and DTS file maps with newly emitted files and prunes deleted
 * source files, returning the sets of changed ESM and DTS file paths.
 *
 * @param emittedFiles Newly emitted files from the Angular compilation.
 * @param esmFiles In-memory map of POSIX ESM file paths to contents.
 * @param dtsFiles In-memory map of POSIX declaration file paths to contents.
 * @param posixReferencedFiles Set of POSIX file paths currently referenced by the program.
 * @param modifiedFiles Optional set of modified POSIX file paths in incremental builds.
 * @returns A promise resolving to the sets of changed ESM and DTS file paths.
 */
async function updateEmittedFileCaches(emittedFiles, esmFiles, dtsFiles, posixReferencedFiles, modifiedFiles) {
    const changedEsmFiles = new Set();
    const changedDtsFiles = new Set();
    const removalChecks = [];
    for (const modifiedFile of modifiedFiles ?? []) {
        if (posixReferencedFiles.has(modifiedFile)) {
            continue;
        }
        const basePathWithoutExt = modifiedFile.replace(/(?:\.d\.[cm]?ts|\.[cm]?[jt]sx?)$/i, '');
        if (basePathWithoutExt === modifiedFile) {
            continue;
        }
        removalChecks.push((0, promises_1.access)(modifiedFile, promises_1.constants.F_OK).then(() => { }, () => {
            for (const ext of EMITTED_EXTENSIONS) {
                const outputPath = `${basePathWithoutExt}${ext}`;
                const mapPath = `${outputPath}.map`;
                if (esmFiles.delete(outputPath)) {
                    changedEsmFiles.add(outputPath);
                }
                if (dtsFiles.delete(outputPath)) {
                    changedDtsFiles.add(outputPath);
                }
                esmFiles.delete(mapPath);
                dtsFiles.delete(mapPath);
            }
        }));
    }
    if (removalChecks.length > 0) {
        await Promise.all(removalChecks);
    }
    for (const { filename, contents } of emittedFiles) {
        const normalized = (0, path_1.toPosixPath)(filename);
        const isMap = normalized.endsWith('.map');
        const isDts = isMap ? (0, utils_1.isDeclarationSourceMapFile)(normalized) : (0, utils_1.isDeclarationFile)(normalized);
        const targetFiles = isDts ? dtsFiles : esmFiles;
        if (targetFiles.get(normalized) !== contents) {
            targetFiles.set(normalized, contents);
            (isDts ? changedDtsFiles : changedEsmFiles).add(isMap ? normalized.slice(0, -4) : normalized);
        }
    }
    return { changedEsmFiles, changedDtsFiles };
}
/**
 * Formats stylesheet bundling diagnostics and TypeScript/Angular diagnostics
 * and records them on the build state's execution result.
 *
 * @param compilationInstance The active Angular compilation instance.
 * @param stylesheetErrors List of stylesheet bundling errors.
 * @param stylesheetWarnings List of initialization and stylesheet bundling warnings.
 * @param colors Whether diagnostic messages should be formatted with ANSI colors.
 * @param buildState The build state whose execution result receives the formatted diagnostics.
 */
async function runDiagnosticsAndFormat(compilationInstance, stylesheetErrors, stylesheetWarnings, colors, buildState) {
    const { executionResult } = buildState;
    const errors = [...stylesheetErrors];
    const warnings = [];
    try {
        const diagnostics = await compilationInstance.diagnoseFiles(environment_options_1.useTypeChecking ? compilation_1.DiagnosticModes.All : compilation_1.DiagnosticModes.All & ~compilation_1.DiagnosticModes.Semantic);
        if (diagnostics.errors?.length) {
            errors.push(...diagnostics.errors);
        }
        if (diagnostics.warnings?.length) {
            warnings.push(...diagnostics.warnings);
        }
    }
    catch (error) {
        (0, error_1.assertIsError)(error);
        errors.push({
            text: error.message,
            location: null,
        });
    }
    warnings.push(...stylesheetWarnings);
    try {
        if (errors.length > 0) {
            executionResult.addErrors(await (0, esbuild_1.formatMessages)(errors, { kind: 'error', color: colors }));
        }
        if (warnings.length > 0) {
            executionResult.addWarnings(await (0, esbuild_1.formatMessages)(warnings, { kind: 'warning', color: colors }));
        }
    }
    catch (error) {
        (0, error_1.assertIsError)(error);
        executionResult.addError(error.message);
    }
}
//# sourceMappingURL=compilation.js.map