/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import type { ComponentStylesheetBundler } from '../../../tools/esbuild/angular/component-stylesheets';
import type { BuilderState } from '../builder-state';
import type { LibraryCompilationOutput, NormalizedLibraryOptions } from '../types';
/**
 * Compiles all library entry points in a single TypeScript and Angular compilation pass.
 *
 * @param options The normalized library builder options with POSIX paths.
 * @param stylesheetBundler The component stylesheet bundler instance.
 * @param buildState The build state tracking compilation caches, file references, and diagnostics.
 * @param modifiedFiles Optional set of modified POSIX file paths for incremental compilation.
 * @returns A promise resolving to the compilation output containing emitted files and cache state.
 */
export declare function compileLibrary(options: NormalizedLibraryOptions, stylesheetBundler: ComponentStylesheetBundler, buildState: BuilderState, modifiedFiles?: Set<string>): Promise<LibraryCompilationOutput>;
