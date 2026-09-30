/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import type { BuilderContext } from '@angular-devkit/architect';
import type { NormalizedLibraryOptions } from '../options';
import { type BundleResult } from './bundler';
import { type SingleProgramCache } from './compilation';
import type { createComponentStylesheetBundlerForLibrary } from './stylesheet-bundler';
/**
 * State preserved across incremental builds in watch mode.
 */
export interface SingleBuildState {
    singleProgramCache?: SingleProgramCache;
    previousBundleResults: Map<string, BundleResult>;
    pendingChangedEsmFiles: Set<string>;
    pendingChangedDtsFiles: Set<string>;
    hasCompilationError?: boolean;
    hasEmittedManifests?: boolean;
    hasEmittedAssets?: boolean;
    directoryExists: Set<string>;
}
/**
 * Creates a fresh {@link SingleBuildState} instance.
 */
export declare function createSingleBuildState(): SingleBuildState;
/**
 * Context required to execute a single library build iteration.
 */
export interface BuildActionContext {
    options: NormalizedLibraryOptions;
    context: BuilderContext;
    stylesheetBundler: ReturnType<typeof createComponentStylesheetBundlerForLibrary>;
    isWatchMode: boolean;
    allWatchedFiles: Set<string>;
    buildState: SingleBuildState;
    modifiedFiles?: Set<string>;
}
/**
 * Executes a single iteration of the library build pipeline, including
 * single-program Angular compilation, parallel typechecking, 2-instance Rolldown bundling,
 * manifest generation, and asset copying.
 *
 * @param actionContext The build action state and configuration.
 */
export declare function buildAction(actionContext: BuildActionContext): Promise<void>;
export declare function hasModifiedWatchedFile(modifiedFiles: ReadonlySet<string>, allWatchedFiles: ReadonlySet<string>, posixPackageJsonPath: string): boolean;
