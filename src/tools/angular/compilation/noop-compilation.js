"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoopCompilation = void 0;
const angular_compilation_1 = require("./angular-compilation");
/**
 * An Angular compilation that performs no actual compilation or code emission.
 * Used for secondary compilation contexts where only the resolved compiler options
 * and configuration state are needed.
 */
class NoopCompilation extends angular_compilation_1.AngularCompilation {
    async initialize(tsconfig, hostOptions, compilerOptionOverrides) {
        // Load the compiler configuration
        const { options: originalCompilerOptions } = await this.loadConfiguration(tsconfig);
        // Apply relevant overrides directly without invoking `transformCompilerOptions`
        // to avoid loading the `typescript` package on the main thread.
        const compilerOptions = {
            ...originalCompilerOptions,
            noEmitOnError: false,
            composite: false,
            inlineSources: !!compilerOptionOverrides?.sourcemap,
            inlineSourceMap: !!compilerOptionOverrides?.sourcemap,
            sourceMap: undefined,
            mapRoot: undefined,
            sourceRoot: undefined,
            preserveSymlinks: compilerOptionOverrides?.preserveSymlinks,
            externalRuntimeStyles: compilerOptionOverrides?.externalRuntimeStyles,
            _enableHmr: !!compilerOptionOverrides?.enableHmr,
            _useTypeScriptTranspilation: !originalCompilerOptions.isolatedModules ||
                !!compilerOptionOverrides?.instrumentForCoverage,
            supportTestBed: !!compilerOptionOverrides?.includeTestMetadata,
            supportJitMode: !!compilerOptionOverrides?.includeTestMetadata,
            customConditions: originalCompilerOptions.moduleResolution === 100 /* Bundler */ ||
                originalCompilerOptions.module === 200 /* Preserve */
                ? compilerOptionOverrides?.customConditions
                : originalCompilerOptions.customConditions,
        };
        return { compilerOptions, referencedFiles: [] };
    }
    emitAffectedFiles() {
        throw new Error('Not available when using noop compilation.');
    }
}
exports.NoopCompilation = NoopCompilation;
//# sourceMappingURL=noop-compilation.js.map