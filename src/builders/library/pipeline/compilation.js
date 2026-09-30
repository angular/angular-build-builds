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
 * @param entryPoints The collection of normalized library entry points to compile.
 * @param options The normalized library builder options.
 * @param stylesheetBundler The component stylesheet bundler instance.
 * @param cached Optional cached compilation state from a previous build iteration.
 * @param modifiedFiles Optional set of modified file paths for incremental compilation.
 * @returns A promise resolving to the compilation output containing emitted files and diagnostics.
 */
async function compileLibrary(entryPoints, options, stylesheetBundler, cached, modifiedFiles) {
    const { tsConfigPath, compilationMode, preserveSymlinks, colors, declarationMap } = options;
    const entryPathsMap = {};
    const rootFiles = [];
    for (const ep of entryPoints) {
        entryPathsMap[ep.displayName] = [ep.entryFilePath];
        rootFiles.push(ep.entryFilePath);
    }
    const compilationInstance = cached?.compilationInstance ?? (await (0, compilation_1.createAngularCompilation)('aot', false));
    try {
        let effectiveModifiedFiles = modifiedFiles;
        if (cached?.failedFiles?.size) {
            stylesheetBundler.invalidate(cached.failedFiles);
            effectiveModifiedFiles = new Set(modifiedFiles);
            for (const file of cached.failedFiles) {
                effectiveModifiedFiles.add(file);
            }
        }
        if (effectiveModifiedFiles && effectiveModifiedFiles.size > 0) {
            await compilationInstance.update?.(effectiveModifiedFiles);
        }
        const allReferencedFiles = new Set();
        const stylesheetWarnings = [];
        const stylesheetErrors = [];
        const failedFiles = new Set();
        const hostOptions = {
            modifiedFiles: effectiveModifiedFiles,
            async transformStylesheet(data, containingFile, stylesheetFile) {
                const result = stylesheetFile
                    ? await stylesheetBundler.bundleFile(stylesheetFile)
                    : await stylesheetBundler.bundleInline(data, containingFile);
                result.referencedFiles?.forEach((f) => allReferencedFiles.add((0, path_1.toPosixPath)(f)));
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
        const { referencedFiles } = await compilationInstance.initialize(tsConfigPath, hostOptions, {
            sourcemap: true,
            preserveSymlinks,
            rootFiles,
            declarationMap,
            compilationMode,
            paths: entryPathsMap,
        }, 'library');
        const emittedFiles = stylesheetErrors.length === 0 ? await compilationInstance.emitAffectedFiles() : [];
        const diagnosePromise = runDiagnosticsAndFormat(compilationInstance, stylesheetErrors, stylesheetWarnings, colors);
        // Prevent unhandled promise rejection if an error occurs before diagnosePromise is awaited.
        diagnosePromise.catch(() => { });
        const esmFiles = cached?.esmFiles ?? new Map();
        const dtsFiles = cached?.dtsFiles ?? new Map();
        const changedEsmFiles = new Set();
        const changedDtsFiles = new Set();
        for (const ref of referencedFiles) {
            allReferencedFiles.add((0, path_1.toPosixPath)(ref));
        }
        if (effectiveModifiedFiles) {
            for (const modifiedFile of effectiveModifiedFiles) {
                const posixModified = (0, path_1.toPosixPath)(modifiedFile);
                if (allReferencedFiles.has(posixModified)) {
                    continue;
                }
                const basePathWithoutExt = posixModified.replace(/(?:\.d\.[cm]?ts|\.[cm]?[jt]sx?)$/i, '');
                if (basePathWithoutExt === posixModified || (0, node_fs_1.existsSync)(posixModified)) {
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
            if (normalized.endsWith('.map')) {
                const isDtsMap = (0, utils_1.isDeclarationSourceMapFile)(normalized);
                const targetMap = isDtsMap ? dtsFiles : esmFiles;
                if (targetMap.get(normalized) !== contents) {
                    targetMap.set(normalized, contents);
                    (isDtsMap ? changedDtsFiles : changedEsmFiles).add(normalized.slice(0, -4));
                }
            }
            else if ((0, utils_1.isDeclarationFile)(normalized)) {
                if (dtsFiles.get(normalized) !== contents) {
                    changedDtsFiles.add(normalized);
                    dtsFiles.set(normalized, contents);
                }
            }
            else if (esmFiles.get(normalized) !== contents) {
                changedEsmFiles.add(normalized);
                esmFiles.set(normalized, contents);
            }
        }
        return {
            esmFiles,
            dtsFiles,
            changedEsmFiles,
            changedDtsFiles,
            referencedFiles: allReferencedFiles,
            cache: {
                compilationInstance,
                esmFiles,
                dtsFiles,
                failedFiles: failedFiles.size > 0 ? failedFiles : undefined,
            },
            diagnosePromise,
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
 * Validates stylesheet bundling results and runs TypeScript/Angular diagnostics.
 *
 * @param compilationInstance The active Angular compilation instance.
 * @param stylesheetErrors List of stylesheet bundling errors.
 * @param stylesheetWarnings List of stylesheet bundling warnings.
 * @param colors Whether diagnostic messages should be formatted with ANSI colors.
 * @returns A promise resolving to formatted warning messages.
 * @throws If stylesheet bundling errors or compilation errors occur.
 */
async function runDiagnosticsAndFormat(compilationInstance, stylesheetErrors, stylesheetWarnings, colors) {
    if (stylesheetErrors.length > 0) {
        const formatted = await (0, esbuild_1.formatMessages)(stylesheetErrors, { kind: 'error', color: colors });
        throw new Error(`Failed to bundle stylesheet:\n${formatted.join('\n')}`);
    }
    const warningsOut = [];
    if (environment_options_1.useTypeChecking) {
        const { errors, warnings } = await compilationInstance.diagnoseFiles();
        if (errors?.length) {
            const errorMessages = await (0, esbuild_1.formatMessages)(errors, { kind: 'error', color: colors });
            throw new Error(`Compilation failed with errors:\n${errorMessages.join('\n')}`);
        }
        if (warnings?.length) {
            const formatted = await (0, esbuild_1.formatMessages)(warnings, { kind: 'warning', color: colors });
            warningsOut.push(...formatted);
        }
    }
    if (stylesheetWarnings.length > 0) {
        const formattedStyleWarnings = await (0, esbuild_1.formatMessages)(stylesheetWarnings, {
            kind: 'warning',
            color: colors,
        });
        warningsOut.push(...formattedStyleWarnings);
    }
    return warningsOut;
}
//# sourceMappingURL=compilation.js.map