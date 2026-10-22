/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
/**
 * Combines default asset ignore patterns with user-provided ignore patterns and normalizes
 * them so directory patterns (such as `'sub'` or `'sub/'`) exclude all nested files.
 *
 * @param ignore Optional user-provided ignore glob patterns.
 * @returns The normalized ignore glob patterns.
 */
export declare function normalizeAssetIgnorePatterns(ignore?: readonly string[]): string[];
export declare function resolveAssets(entries: {
    glob: string;
    ignore?: string[];
    input: string;
    output: string;
    flatten?: boolean;
    followSymlinks?: boolean;
}[], root: string): Promise<{
    source: string;
    destination: string;
}[]>;
