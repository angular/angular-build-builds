/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { type PlatformPath } from 'node:path';
import type { BrowserConfigOptions, Vite } from 'vitest/node';
import type { NormalizedCachedOptions } from '../../../../utils/normalize-cache';
import type { ResultFile } from '../../../application/results';
import type { NormalizedUnitTestBuilderOptions } from '../../options';
interface PluginOptions {
    workspaceRoot: string;
    projectSourceRoot: string;
    projectName: string;
    buildResultFiles: ReadonlyMap<string, ResultFile>;
    testFileToEntryPoint: ReadonlyMap<string, string>;
    setupFiles: readonly string[];
}
interface VitestConfigPluginOptions {
    browser: BrowserConfigOptions | undefined;
    cacheOptions: NormalizedCachedOptions;
    coverage: NormalizedUnitTestBuilderOptions['coverage'];
    projectName: string;
    projectSourceRoot: string;
    reporters?: string[] | [string, object][];
    setupFiles: string[];
    projectPlugins: Vite.PluginOption[];
    include: string[];
    optimizeDepsInclude: string[];
    watch: boolean;
    isolate: boolean | undefined;
    preserveSymlinks?: boolean;
}
export declare function createVitestConfigPlugin(options: VitestConfigPluginOptions): Promise<Vite.Plugin>;
/**
 * Rebases a file path from `fromRoot` to `toRoot` in POSIX format.
 *
 * The path is rebased using its location relative to `fromRoot`. This includes a path outside of
 * `fromRoot` (reached through `..` segments), which matches how Vitest resolves the root relative
 * test `include` entries. Only a path that cannot be expressed relative to `fromRoot`, such as a
 * file on a different Windows drive, is left unchanged (as POSIX).
 *
 * @param filePath The absolute file path to rebase.
 * @param fromRoot The root that `filePath` is currently based on.
 * @param toRoot The root to rebase `filePath` onto.
 * @param pathImpl The path implementation to use. Defaults to that of the host platform.
 * @returns The rebased file path in POSIX format.
 */
export declare function rebasePath(filePath: string, fromRoot: string, toRoot: string, pathImpl?: PlatformPath): string;
export declare function createVitestPlugins(pluginOptions: PluginOptions): Vite.Plugin[];
export {};
