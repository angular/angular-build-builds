/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import type { NormalizedEntryPoint, NormalizedLibraryOptions, PackageJsonData, SingleBuildState } from '../types';
import type { BundleEntryPointInput } from './bundler';
/**
 * Computes the base bundle file name for an entry point.
 *
 * @param packageName The package name from package.json.
 * @param entryPointName The entry point subpath name (defaults to '.').
 * @returns The sanitized bundle base name.
 */
export declare function getEntryPointBundleName(packageName: string, entryPointName?: string): string;
/**
 * Normalizes all entry points from the library's `package.json` `exports` field.
 *
 * @param rawExports The `exports` field from `package.json`.
 * @param projectRoot The library project root POSIX directory path.
 * @param packageJsonPath POSIX path to `package.json` for error reporting.
 * @param packageName The root package name (e.g. `@my/lib`).
 * @returns A Map of normalized entry points keyed by name with POSIX entry file paths.
 */
export declare function normalizeEntryPoints(rawExports: unknown, projectRoot: string, packageJsonPath: string, packageName: string): Map<string, NormalizedEntryPoint>;
/**
 * Determines whether two sets of normalized entry points differ in keys, POSIX entry paths, or subpaths.
 *
 * @param oldEntryPoints The previous map of normalized entry points.
 * @param newEntryPoints The new map of normalized entry points.
 * @returns `true` if any entry point was added, removed, or modified; otherwise `false`.
 */
export declare function haveEntryPointsChanged(oldEntryPoints: ReadonlyMap<string, NormalizedEntryPoint>, newEntryPoints: ReadonlyMap<string, NormalizedEntryPoint>): boolean;
/**
 * Updates watched files, entry points in options, and cached bundle results when package.json entry points change.
 *
 * @param packageJson The reloaded `package.json` data.
 * @param options The normalized library builder options.
 * @param buildState The state preserved across incremental builds.
 * @param watchedCompilationFiles Set of POSIX file paths tracked for compilation.
 * @param packageJsonPath Normalized POSIX path to `package.json`.
 */
export declare function updateWatchedEntryPoints(packageJson: PackageJsonData, options: NormalizedLibraryOptions, buildState: SingleBuildState, watchedCompilationFiles: Set<string>, packageJsonPath: string): void;
/**
 * Determines which entry points have modified JavaScript or declaration files
 * and collects them for bundling.
 *
 * @param options The normalized library builder options.
 * @param buildState The state preserved across incremental builds.
 * @param logs Array of informational log messages to append to when an entry point is queued.
 * @returns The list of entry points that require bundling in the current build iteration.
 */
export declare function collectEntryPointsToBundle(options: NormalizedLibraryOptions, buildState: SingleBuildState, logs: string[]): BundleEntryPointInput[];
