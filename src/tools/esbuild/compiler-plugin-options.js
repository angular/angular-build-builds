"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCompilerPluginOptions = createCompilerPluginOptions;
function createCompilerPluginOptions(options, target, sourceFileCache) {
    const { workspaceRoot, optimizationOptions, sourcemapOptions, tsconfig, outputNames, fileReplacements, externalDependencies, preserveSymlinks, stylePreprocessorOptions, advancedOptimizations, inlineStyleLanguage, jit, cacheOptions, tailwindConfiguration, postcssConfiguration, publicPath, externalRuntimeStyles, instrumentForCoverage, } = options;
    return {
        // JS/TS options
        pluginOptions: {
            sourcemap: !!sourcemapOptions.scripts && (sourcemapOptions.hidden ? 'external' : true),
            thirdPartySourcemaps: sourcemapOptions.vendor,
            tsconfig,
            jit,
            advancedOptimizations,
            fileReplacements,
            sourceFileCache,
            loadResultCache: sourceFileCache?.loadResultCache,
            incremental: !!options.watch,
            externalRuntimeStyles,
            instrumentForCoverage,
        },
        // Component stylesheet options
        styleOptions: {
            workspaceRoot,
            inlineFonts: !!optimizationOptions.fonts.inline,
            optimization: !!optimizationOptions.styles.minify,
            sourcemap: 
            // Hidden component stylesheet sourcemaps are inaccessible which is effectively
            // the same as being disabled. Disabling has the advantage of avoiding the overhead
            // of sourcemap processing.
            sourcemapOptions.styles && !sourcemapOptions.hidden ? 'linked' : false,
            outputNames,
            includePaths: stylePreprocessorOptions?.includePaths,
            // string[] | undefined' is not assignable to type '(Version | DeprecationOrId)[] | undefined'.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            sass: stylePreprocessorOptions?.sass,
            externalDependencies,
            target,
            inlineStyleLanguage,
            preserveSymlinks,
            tailwindConfiguration,
            postcssConfiguration,
            cacheOptions,
            publicPath,
        },
    };
}
