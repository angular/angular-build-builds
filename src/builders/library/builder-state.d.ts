/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { ExecutionResult } from './execution-result';
import type { BundleResult, LibraryCompilationOutput, NormalizedLibraryOptions, SingleProgramCache } from './types';
/**
 * Encapsulates incremental compilation state, transitive resource reference tracking,
 * watched compilation file tracking, and execution results across watch-mode rebuilds.
 */
export declare class BuilderState {
    #private;
    /** Map of entry point names to their previous bundle results. */
    readonly previousBundleResults: Map<string, BundleResult>;
    /** Set of changed POSIX ESM file paths pending bundling. */
    readonly pendingChangedEsmFiles: Set<string>;
    /** Set of changed POSIX TypeScript declaration file paths pending bundling. */
    readonly pendingChangedDtsFiles: Set<string>;
    /** Whether the previous build iteration encountered a compilation or diagnostic error. */
    hasCompilationError: boolean;
    /** Whether package.json and secondary entry point manifests have been emitted. */
    hasEmittedManifests: boolean;
    /** Whether the last emitted root package.json included a tslib dependency. */
    hasEmittedTslib: boolean;
    /** Whether static assets have been emitted in a prior iteration. */
    hasEmittedAssets: boolean;
    /** Whether entry points in package.json changed since the last compilation. */
    hasEntryPointsChanges: boolean;
    constructor(options?: Partial<Pick<NormalizedLibraryOptions, 'tsConfigPath' | 'packageJsonPath' | 'entryPoints'>>);
    /** Cached unified TypeScript and Angular compilation state. */
    get singleProgramCache(): SingleProgramCache | undefined;
    /** Effective compilation mode resolved from builder options and tsconfig. */
    get compilationMode(): 'partial' | 'full' | undefined;
    /** Whether any active entry point bundle imports `tslib`. */
    get hasTslibImport(): boolean;
    /**
     * Set of POSIX file paths tracked for compilation and configuration
     * (including `tsconfig.json`, `package.json`, entry points, and referenced source,
     * template, and stylesheet files).
     */
    get watchedCompilationFiles(): Set<string>;
    /**
     * Execution result holding errors, warnings, and logs for the current build iteration.
     */
    get executionResult(): ExecutionResult;
    /**
     * Resets the execution result for a new build iteration.
     *
     * @returns The fresh `ExecutionResult` instance for the current build iteration.
     */
    resetExecutionResult(): ExecutionResult;
    /**
     * Records transitive resource dependencies (such as Sass partials) for a containing
     * component or stylesheet file and registers them in `watchedCompilationFiles`.
     * Multiple calls for the same containing file accumulate references additively.
     *
     * @param containingFile Path of the referencing component or stylesheet file.
     * @param referencedFiles Paths of the referenced files.
     */
    addFileReferences(containingFile: string, referencedFiles: Iterable<string>): void;
    /**
     * Clears previously recorded outgoing resource references for the given containing files
     * before they are recompiled.
     *
     * @param containingFiles Paths of the containing or stylesheet files being recompiled.
     */
    clearFileReferences(containingFiles: Iterable<string>): void;
    /**
     * Returns the set of all files affected by the given changed files, including the
     * changed files themselves and all transitively referencing files
     * (e.g., partial `.scss` -> component `.scss` -> component `.ts`).
     *
     * @param files Initial changed file paths.
     * @returns Set of POSIX paths including all transitively referencing files.
     */
    getAffectedFiles(files: Iterable<string>): Set<string>;
    /**
     * Determines whether compilation and bundling need to run for the current build iteration.
     * Also records incoming modified files so they are retained if the iteration aborts early.
     *
     * @param packageJsonPath Normalized POSIX path to the library's `package.json`.
     * @param modifiedFiles Optional set of modified POSIX file paths in watch mode.
     * @returns `true` if entry points should be compiled; otherwise `false`.
     */
    shouldCompileEntryPoints(packageJsonPath: string, modifiedFiles?: ReadonlySet<string>): boolean;
    /**
     * Returns the effective set of modified POSIX file paths for compilation,
     * merging any pending compilation files from earlier aborted iterations.
     *
     * @param modifiedFiles Optional set of modified POSIX file paths from the current iteration.
     * @returns Merged set of modified POSIX file paths, or `undefined` for a full compilation.
     */
    getCompilationModifiedFiles(modifiedFiles?: ReadonlySet<string>): Set<string> | undefined;
    /**
     * Records compilation output into the build state, updating the program cache,
     * watched compilation files, and pending changed ESM/DTS file sets.
     *
     * @param output The compilation output produced by `compileLibrary`.
     */
    recordCompilationOutput(output: LibraryCompilationOutput): void;
    /**
     * Records active bundle results across entry points after compilation and bundling succeed,
     * clearing pending compilation/bundle flags.
     *
     * @param bundleResults Newly bundled results keyed by entry point name.
     */
    recordBundleOutput(bundleResults: ReadonlyMap<string, BundleResult>): void;
    /**
     * Disposes active compilation resources and clears cached state.
     */
    dispose(): Promise<void>;
}
