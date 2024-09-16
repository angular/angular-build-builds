/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { BuildOutputFile } from '../../tools/esbuild/bundler-context';
import { BuildOutputAsset } from '../../tools/esbuild/bundler-execution-result';
import type { SerializableRouteTreeNode } from './routes-extractor-worker';
interface PrerenderOptions {
    routesFile?: string;
    discoverRoutes?: boolean;
}
interface AppShellOptions {
    route?: string;
}
/**
 * Represents the output of a prerendering process.
 *
 * The key is the file path, and the value is an object containing the following properties:
 *
 * - `content`: The HTML content or output generated for the corresponding file path.
 * - `appShellRoute`: A boolean flag indicating whether the content is an app shell.
 *
 * @example
 * {
 *   '/index.html': { content: '<html>...</html>', appShell: false },
 *   '/shell/index.html': { content: '<html>...</html>', appShellRoute: true }
 * }
 */
type PrerenderOutput = Record<string, {
    content: string;
    appShellRoute: boolean;
}>;
export declare function prerenderPages(workspaceRoot: string, baseHref: string, appShellOptions: AppShellOptions | undefined, prerenderOptions: PrerenderOptions | undefined, outputFiles: Readonly<BuildOutputFile[]>, assets: Readonly<BuildOutputAsset[]>, sourcemap?: boolean, maxThreads?: number, verbose?: boolean): Promise<{
    output: PrerenderOutput;
    warnings: string[];
    errors: string[];
    prerenderedRoutes: Set<string>;
    serializableRouteTreeNode: SerializableRouteTreeNode;
}>;
export {};
