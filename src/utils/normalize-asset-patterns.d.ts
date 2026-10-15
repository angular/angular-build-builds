/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import type { AssetPattern, AssetPatternClass } from '../builders/application/schema';
/**
 * Asset pattern configuration normalized into its object form with a resolved `output` directory.
 */
export interface NormalizedAssetsPattern extends AssetPatternClass {
    /** Relative output directory within the build output path. */
    output: string;
}
/**
 * Normalizes raw string and object asset patterns into {@link NormalizedAssetsPattern} objects
 * and validates that all asset inputs and outputs stay within the workspace and output directories.
 *
 * @param assetPatterns Raw string or object asset patterns from builder options.
 * @param workspaceRoot Workspace root directory path.
 * @param projectRoot Project root directory path.
 * @param projectSourceRoot Optional project source root directory path.
 * @returns An array of normalized asset pattern configurations.
 */
export declare function normalizeAssetPatterns(assetPatterns: AssetPattern[], workspaceRoot: string, projectRoot: string, projectSourceRoot: string | undefined): NormalizedAssetsPattern[];
