/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import type { BundleResult, NormalizedEntryPoint, NormalizedLibraryOptions } from '../types';
import { type MemoryOutputFile } from './utils';
/**
 * Output of the entry point bundling process.
 */
export interface BundleEntryPointsOutput {
    /** In-memory files produced by bundling to be written to disk. */
    filesToEmit: MemoryOutputFile[];
    /** Map of entry point names to their bundle results containing bundled module IDs. */
    bundleResults: Map<string, BundleResult>;
}
/**
 * Input state for an individual entry point to be bundled.
 */
export interface BundleEntryPointInput {
    /** The normalized entry point to bundle. */
    entryPoint: NormalizedEntryPoint;
    /** Whether the entry point has changed ESM files requiring rebundling. */
    hasEsmChanges: boolean;
    /** Whether the entry point has changed TypeScript declaration files requiring rebundling. */
    hasDtsChanges: boolean;
    /** The previous bundle result from a prior build iteration, if available. */
    previousBundleResult?: BundleResult;
}
/**
 * Bundles the compiled in-memory JavaScript and declaration files for all dirty entry points
 * using at most 2 Rolldown instances total (1 for all .mjs bundles, 1 for all .d.ts bundles).
 *
 * @param items The collection of entry point inputs with change statuses.
 * @param esmFiles Map of virtual ESM output file paths to their content.
 * @param dtsFiles Map of virtual TypeScript declaration file paths to their content.
 * @param options The normalized library builder options.
 * @returns A promise resolving to the bundled output files and bundle cache results.
 */
export declare function bundleEntryPoints(items: readonly BundleEntryPointInput[], esmFiles: ReadonlyMap<string, string>, dtsFiles: ReadonlyMap<string, string>, options: NormalizedLibraryOptions): Promise<BundleEntryPointsOutput>;
