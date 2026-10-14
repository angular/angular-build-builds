/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import type { ComponentStylesheetBundler } from '../../../tools/esbuild/angular/component-stylesheets';
import type { NormalizedEntryPoint, NormalizedLibraryOptions, SingleProgramCache } from '../types';
/**
 * Formatted diagnostic messages produced during library compilation.
 */
export interface LibraryCompilationDiagnostics {
    /** Formatted compilation error messages. */
    readonly errors: string[];
    /** Formatted compilation warning messages. */
    readonly warnings: string[];
}
/**
 * Output of the unified library compilation step.
 */
export interface LibraryCompilationOutput {
    /** Read-only map of emitted JavaScript files keyed by POSIX path. */
    readonly esmFiles: ReadonlyMap<string, string>;
    /** Read-only map of emitted TypeScript declaration files keyed by POSIX path. */
    readonly dtsFiles: ReadonlyMap<string, string>;
    /** Set of POSIX JavaScript file paths that were modified or newly emitted in this iteration. */
    readonly changedEsmFiles: ReadonlySet<string>;
    /** Set of POSIX declaration file paths that were modified or newly emitted in this iteration. */
    readonly changedDtsFiles: ReadonlySet<string>;
    /** Set of all POSIX source and dependency file paths referenced during compilation. */
    readonly referencedFiles: ReadonlySet<string>;
    /** Cached compilation state for subsequent incremental builds. */
    readonly cache: SingleProgramCache;
    /** Whether any component stylesheet bundling errors occurred. */
    readonly hasStylesheetErrors: boolean;
    /** Promise that resolves to formatted compilation diagnostic errors and warnings. */
    readonly diagnosePromise: Promise<LibraryCompilationDiagnostics>;
    /** Effective declarationMap setting resolved from builder options and tsconfig. */
    readonly declarationMap: boolean;
    /** Effective compilationMode setting resolved from builder options and tsconfig. */
    readonly compilationMode: 'partial' | 'full';
}
/**
 * Compiles all library entry points in a single TypeScript and Angular compilation pass.
 *
 * @param entryPoints The collection of normalized library entry points to compile.
 * @param options The normalized library builder options with POSIX paths.
 * @param stylesheetBundler The component stylesheet bundler instance.
 * @param cached Optional cached compilation state from a previous build iteration.
 * @param modifiedFiles Optional set of modified POSIX file paths for incremental compilation.
 * @returns A promise resolving to the compilation output containing emitted files and diagnostics.
 */
export declare function compileLibrary(entryPoints: Iterable<NormalizedEntryPoint>, options: NormalizedLibraryOptions, stylesheetBundler: ComponentStylesheetBundler, cached?: SingleProgramCache, modifiedFiles?: Set<string>): Promise<LibraryCompilationOutput>;
