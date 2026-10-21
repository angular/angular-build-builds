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
const node_fs_1 = require("node:fs");
const compilation_1 = require("../../../tools/angular/compilation");
const environment_options_1 = require("../../../utils/environment-options");
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
            buildState.clearFileReferences(effectiveModifiedFiles);
        }
        const stylesheetWarnings = [];
        const stylesheetErrors = [];
        const failedFiles = new Set();
        const hostOptions = {
            modifiedFiles: effectiveModifiedFiles,
            async transformStylesheet(data, containingFile, stylesheetFile) {
                const result = stylesheetFile
                    ? await stylesheetBundler.bundleFile(stylesheetFile)
                    : await stylesheetBundler.bundleInline(data, containingFile);
                if (result.referencedFiles) {
                    buildState.addFileReferences(stylesheetFile ?? containingFile, result.referencedFiles);
                }
                if (result.warnings.length > 0) {
                    stylesheetWarnings.push(...result.warnings);
                }
                if (result.errors?.length) {
                    stylesheetErrors.push(...result.errors);
                    failedFiles.add((0, path_1.toPosixPath)(containingFile));
                    if (stylesheetFile) {
                        failedFiles.add((0, path_1.toPosixPath)(stylesheetFile));
                    }
                    return '';
                }
                return result.contents;
            },
            processWebWorker: () => '',
        };
        const { referencedFiles, compilerOptions } = await compilationInstance.initialize(tsConfigPath, hostOptions, {
            sourcemap: true,
            preserveSymlinks,
            rootFiles,
            declarationMap,
            compilationMode,
            paths: entryPathsMap,
            cachePath: cacheOptions.enabled ? cacheOptions.path : undefined,
        }, 'library');
        const hasStylesheetErrors = stylesheetErrors.length > 0;
        const emittedFiles = hasStylesheetErrors ? [] : await compilationInstance.emitAffectedFiles();
        const diagnosePromise = runDiagnosticsAndFormat(compilationInstance, stylesheetErrors, stylesheetWarnings, colors, buildState);
        const esmFiles = cached?.esmFiles ?? new Map();
        const dtsFiles = cached?.dtsFiles ?? new Map();
        const changedEsmFiles = new Set();
        const changedDtsFiles = new Set();
        const posixReferencedFiles = new Set(referencedFiles.map(path_1.toPosixPath));
        if (cached && effectiveModifiedFiles) {
            for (const modifiedFile of effectiveModifiedFiles) {
                if (posixReferencedFiles.has(modifiedFile)) {
                    continue;
                }
                const basePathWithoutExt = modifiedFile.replace(/(?:\.d\.[cm]?ts|\.[cm]?[jt]sx?)$/i, '');
                if (basePathWithoutExt === modifiedFile || (0, node_fs_1.existsSync)(modifiedFile)) {
                    continue;
                }
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
            }
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
 * Formats stylesheet bundling diagnostics and TypeScript/Angular diagnostics
 * and records them on the build state's execution result.
 *
 * @param compilationInstance The active Angular compilation instance.
 * @param stylesheetErrors List of stylesheet bundling errors.
 * @param stylesheetWarnings List of stylesheet bundling warnings.
 * @param colors Whether diagnostic messages should be formatted with ANSI colors.
 * @param buildState The build state whose execution result receives the formatted diagnostics.
 */
async function runDiagnosticsAndFormat(compilationInstance, stylesheetErrors, stylesheetWarnings, colors, buildState) {
    const { executionResult } = buildState;
    const errors = [...stylesheetErrors];
    const warnings = [];
    if (errors.length === 0 && environment_options_1.useTypeChecking) {
        const diagnostics = await compilationInstance.diagnoseFiles();
        if (diagnostics.errors?.length) {
            errors.push(...diagnostics.errors);
        }
        if (diagnostics.warnings?.length) {
            warnings.push(...diagnostics.warnings);
        }
    }
    warnings.push(...stylesheetWarnings);
    if (errors.length > 0) {
        executionResult.addErrors(await (0, esbuild_1.formatMessages)(errors, { kind: 'error', color: colors }));
    }
    if (warnings.length > 0) {
        executionResult.addWarnings(await (0, esbuild_1.formatMessages)(warnings, { kind: 'warning', color: colors }));
    }
}
//# sourceMappingURL=compilation.js.map