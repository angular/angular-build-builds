/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { type AngularCompilation } from '../../../tools/angular/compilation';
import type { ComponentStylesheetBundler } from '../../../tools/esbuild/angular/component-stylesheets';
import type { NormalizedEntryPoint, NormalizedLibraryOptions } from '../options';
/**
 * Cached state for the single unified library compilation.
 */
export interface SingleProgramCache {
    /** The active Angular compilation instance. */
    readonly compilationInstance: AngularCompilation;
    /** In-memory map of emitted JavaScript files keyed by relative output path. */
    readonly esmFiles: Map<string, string>;
    /** In-memory map of emitted TypeScript declaration files keyed by relative output path. */
    readonly dtsFiles: Map<string, string>;
    /** Set of file paths that failed during stylesheet bundling or compilation. */
    readonly failedFiles?: ReadonlySet<string>;
}
/**
 * Output of the unified library compilation step.
 */
export interface LibraryCompilationOutput {
    /** Read-only map of emitted JavaScript files. */
    readonly esmFiles: ReadonlyMap<string, string>;
    /** Read-only map of emitted TypeScript declaration files. */
    readonly dtsFiles: ReadonlyMap<string, string>;
    /** Set of JavaScript file paths that were modified or newly emitted in this iteration. */
    readonly changedEsmFiles: ReadonlySet<string>;
    /** Set of declaration file paths that were modified or newly emitted in this iteration. */
    readonly changedDtsFiles: ReadonlySet<string>;
    /** Set of all source and dependency file paths referenced during compilation. */
    readonly referencedFiles: ReadonlySet<string>;
    /** Cached compilation state for subsequent incremental builds. */
    readonly cache: SingleProgramCache;
    /** Promise that resolves to formatted compilation warnings or rejects on diagnostic errors. */
    readonly diagnosePromise: Promise<string[]>;
}
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
export declare function compileLibrary(entryPoints: Iterable<NormalizedEntryPoint>, options: NormalizedLibraryOptions, stylesheetBundler: ComponentStylesheetBundler, cached?: SingleProgramCache, modifiedFiles?: Set<string>): Promise<LibraryCompilationOutput>;
