/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import type { NormalizedLibraryOptions } from '../types';
import { type DiskOutputFile } from './utils';
/**
 * Resolves and collects configured library assets to be emitted to disk,
 * and registers their source paths with the watch set.
 *
 * @param assets The normalized asset patterns.
 * @param workspaceRoot The workspace root directory path.
 * @param allWatchedFiles Set collecting all watched file paths for watch mode.
 * @param modifiedFiles Optional set of modified file paths for incremental copying in watch mode.
 * @returns An array of disk file emission descriptors.
 */
export declare function collectAssetsToEmit(assets: NormalizedLibraryOptions['assets'], workspaceRoot: string, allWatchedFiles: Set<string>, modifiedFiles?: ReadonlySet<string>): Promise<DiskOutputFile[]>;
/**
 * Checks whether any configured library assets were modified.
 *
 * @param assets The normalized asset patterns.
 * @param workspaceRoot The workspace root directory path.
 * @param changedFiles Set of changed file paths.
 * @returns True if any asset file was modified.
 */
export declare function checkAssetChanges(assets: NormalizedLibraryOptions['assets'], workspaceRoot: string, changedFiles: ReadonlySet<string>): boolean;
