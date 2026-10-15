/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import type { ComponentStylesheetBundler } from '../../../tools/esbuild/angular/component-stylesheets';
import type { BuilderState } from '../builder-state';
import type { ExecutionResult } from '../execution-result';
import type { NormalizedLibraryOptions } from '../types';
import type { DiskOutputFile } from './utils';
/**
 * Context required to execute a single library build iteration.
 */
export interface BuildActionContext {
    /** Normalized options for the library build with POSIX paths. */
    options: NormalizedLibraryOptions;
    /** Bundler instance used to process component stylesheets. */
    stylesheetBundler: ComponentStylesheetBundler;
    /** Whether the builder is running in watch mode. */
    isWatchMode: boolean;
    /** Build state tracking compilation caches and emitted outputs. */
    buildState: BuilderState;
    /** Set of POSIX file paths modified since the last build iteration. */
    modifiedFiles?: Set<string>;
    /**
     * Asset files to emit for the current build iteration.
     * Pre-collected in the watch loop to avoid redundant asset matching, or resolved and
     * populated by `buildAction` when omitted (such as during the initial build) so the
     * caller can register their POSIX source paths with the file watcher.
     */
    assetsToEmit?: DiskOutputFile[];
}
/**
 * Executes a single iteration of the library build pipeline, including
 * single-program Angular compilation, parallel typechecking, 2-instance Rolldown bundling,
 * manifest generation, and asset copying.
 *
 * @param actionContext The build action state and configuration.
 * @returns A promise resolving to the build iteration's `ExecutionResult`.
 */
export declare function buildAction(actionContext: BuildActionContext): Promise<ExecutionResult>;
