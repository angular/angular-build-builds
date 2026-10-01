/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import type { NormalizedLibraryOptions } from '../types';
import { type MemoryOutputFile } from './utils';
/**
 * Generates the APF package.json and secondary entry point package.json manifests.
 *
 * @param options The normalized library options.
 * @param isWatchMode Whether the builder is running in watch mode.
 * @returns An array of memory output files containing generated package manifests and .npmignore.
 */
export declare function generatePackageManifests(options: NormalizedLibraryOptions, isWatchMode: boolean): MemoryOutputFile[];
