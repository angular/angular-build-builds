/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
export interface NormalizedCachedOptions {
    /** Whether disk cache is enabled. */
    enabled: boolean;
    /** Disk cache path. Example: `/.angular/cache/v12.0.0`. */
    path: string;
    /** Disk cache base path. Example: `/.angular/cache`. */
    basePath: string;
    /**
     * Workspace-local disk cache path. Example: `/.angular/cache/v12.0.0`.
     * Always resolves relative to the current workspace root, even within a Git worktree.
     */
    localPath?: string;
    /**
     * Workspace-local disk cache base path. Example: `/.angular/cache`.
     * Always resolves relative to the current workspace root, even within a Git worktree.
     */
    localBasePath?: string;
}
/**
 * Normalizes the persistent disk cache configuration for a project or workspace.
 *
 * Resolves whether disk caching is enabled based on the CLI cache metadata, current runtime
 * environment (local vs. CI, or WebContainers), and computes the versioned cache directory paths
 * (resolving shared Git worktree paths when applicable).
 *
 * @param projectMetadata The project or workspace metadata object containing optional `cli.cache` settings.
 * @param workspaceRoot The absolute path to the workspace root directory.
 * @param projectName Optional name of the project used to scope the resolved cache path.
 * @param builderName Optional name of the builder or tool used to further scope the resolved cache path.
 * @returns The normalized disk cache options including enabled state and resolved directory paths.
 */
export declare function normalizeCacheOptions(projectMetadata: unknown, workspaceRoot: string, projectName?: string, builderName?: string): NormalizedCachedOptions;
