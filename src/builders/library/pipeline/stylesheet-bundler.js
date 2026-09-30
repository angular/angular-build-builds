"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createComponentStylesheetBundlerForLibrary = createComponentStylesheetBundlerForLibrary;
const component_stylesheets_1 = require("../../../tools/esbuild/angular/component-stylesheets");
/**
 * Creates a stylesheet bundler instance configured for library compilation.
 *
 * @param options The normalized library builder options.
 * @param incremental Whether incremental watch mode is enabled.
 * @param target The esbuild target environments derived from browserslist.
 * @returns A new ComponentStylesheetBundler instance.
 */
function createComponentStylesheetBundlerForLibrary(options, incremental, target) {
    const { workspaceRoot, preserveSymlinks, styleIncludePaths, sass, cacheOptions, inlineStyleLanguage, postcssConfiguration, tailwindConfiguration, } = options;
    const bundleOptions = {
        workspaceRoot,
        optimization: true,
        inlineFonts: false,
        dataurl: true,
        target,
        preserveSymlinks,
        sourcemap: false,
        outputNames: { bundles: '[name]', media: 'media/[name]' },
        includePaths: styleIncludePaths,
        sass,
        cacheOptions,
        postcssConfiguration,
        tailwindConfiguration,
    };
    return new component_stylesheets_1.ComponentStylesheetBundler(bundleOptions, inlineStyleLanguage, incremental);
}
//# sourceMappingURL=stylesheet-bundler.js.map