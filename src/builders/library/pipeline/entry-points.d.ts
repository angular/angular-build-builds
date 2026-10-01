/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import type { NormalizedEntryPoint, NormalizedLibraryOptions, PackageJsonData, SingleBuildState } from '../types';
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
 * @param projectRoot The library project root directory.
 * @param packageJsonPath Path to `package.json` for error reporting.
 * @param packageName The root package name (e.g. `@my/lib`).
 * @returns A Map of normalized entry points keyed by name.
 */
export declare function normalizeEntryPoints(rawExports: unknown, projectRoot: string, packageJsonPath: string, packageName: string): Map<string, NormalizedEntryPoint>;
/**
 * Determines whether two sets of normalized entry points differ in keys, paths, or subpaths.
 */
export declare function haveEntryPointsChanged(oldEntryPoints: ReadonlyMap<string, NormalizedEntryPoint>, newEntryPoints: ReadonlyMap<string, NormalizedEntryPoint>): boolean;
/**
 * Updates watched files, entry points in options, and cached bundle results when package.json entry points change.
 */
export declare function updateWatchedEntryPoints(packageJson: PackageJsonData, options: NormalizedLibraryOptions, buildState: SingleBuildState, allWatchedFiles: Set<string>, packageJsonPath: string): void;
