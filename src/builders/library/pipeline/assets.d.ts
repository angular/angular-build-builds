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
 * Resolves and collects configured library assets to be emitted to disk.
 *
 * @param assets The normalized asset patterns.
 * @param workspaceRoot The workspace root directory path.
 * @param modifiedFiles Optional set of modified file paths for incremental copying in watch mode.
 * @returns An array of disk file emission descriptors.
 */
export declare function collectAssetsToEmit(assets: NormalizedLibraryOptions['assets'], workspaceRoot: string, modifiedFiles?: ReadonlySet<string>): Promise<DiskOutputFile[]>;
