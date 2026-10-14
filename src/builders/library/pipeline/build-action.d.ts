/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import type { BuilderContext } from '@angular-devkit/architect';
import type { ComponentStylesheetBundler } from '../../../tools/esbuild/angular/component-stylesheets';
import type { NormalizedLibraryOptions, SingleBuildState } from '../types';
import type { DiskOutputFile } from './utils';
/**
 * Result of executing a single library build iteration.
 */
export interface BuildActionResult {
    /** Formatted error messages produced during the build. */
    errors: string[];
    /** Formatted warning messages produced during the build. */
    warnings: string[];
    /** Informational log messages produced during the build. */
    logs: string[];
}
/**
 * Creates a fresh {@link SingleBuildState} instance.
 */
export declare function createSingleBuildState(): SingleBuildState;
/**
 * Context required to execute a single library build iteration.
 */
export interface BuildActionContext {
    /** Normalized options for the library build with POSIX paths. */
    options: NormalizedLibraryOptions;
    /** The Architect builder context. */
    context: BuilderContext;
    /** Bundler instance used to process component stylesheets. */
    stylesheetBundler: ComponentStylesheetBundler;
    /** Whether the builder is running in watch mode. */
    isWatchMode: boolean;
    /**
     * Set of POSIX file paths tracked for compilation and configuration
     * (including `tsconfig.json`, `package.json`, entry points, and referenced source,
     * template, and stylesheet files). Updated during compilation and used to determine
     * whether file changes require recompiling entry points, excluding asset files so
     * asset-only changes do not trigger code compilation.
     */
    watchedCompilationFiles: Set<string>;
    /** State preserved across incremental builds in watch mode. */
    buildState: SingleBuildState;
    /** Set of POSIX file paths modified since the last build iteration. */
    modifiedFiles?: Set<string>;
    /**
     * Asset files to emit to disk for the current build iteration.
     * Pre-collected in the watch loop to avoid redundant asset matching, or resolved and
     * populated by `buildAction` when omitted (such as during the initial build) so the
     * caller can register their source paths with the file watcher.
     */
    assetsToEmit?: DiskOutputFile[];
}
/**
 * Executes a single iteration of the library build pipeline, including
 * single-program Angular compilation, parallel typechecking, 2-instance Rolldown bundling,
 * manifest generation, and asset copying.
 *
 * @param actionContext The build action state and configuration.
 * @returns A promise resolving to the build action result containing errors, warnings, and logs.
 */
export declare function buildAction(actionContext: BuildActionContext): Promise<BuildActionResult>;
/**
 * Checks whether any modified file (excluding `package.json`) is part of the
 * tracked compilation file set.
 *
 * @param modifiedFiles Set of POSIX file paths modified since the last build.
 * @param watchedCompilationFiles Set of POSIX file paths tracked for compilation.
 * @param packageJsonPath The normalized POSIX path to the library's `package.json`.
 * @returns `true` if a watched compilation file was modified; otherwise `false`.
 */
export declare function hasModifiedWatchedFile(modifiedFiles: ReadonlySet<string>, watchedCompilationFiles: ReadonlySet<string>, packageJsonPath: string): boolean;
