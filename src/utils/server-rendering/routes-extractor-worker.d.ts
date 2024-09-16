/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import type { ɵextractRoutesAndCreateRouteTree } from '@angular/ssr';
import type { ESMInMemoryFileLoaderWorkerData } from './esm-in-memory-loader/loader-hooks';
export interface RoutesExtractorWorkerData extends ESMInMemoryFileLoaderWorkerData {
    assetFiles: Record</** Destination */ string, /** Source */ string>;
}
export type SerializableRouteTreeNode = ReturnType<Awaited<ReturnType<typeof ɵextractRoutesAndCreateRouteTree>>['routeTree']['toObject']>;
export interface RoutersExtractorWorkerResult {
    serializedRouteTree: SerializableRouteTreeNode;
    errors: string[];
}
/** Renders an application based on a provided options. */
declare function extractRoutes(): Promise<RoutersExtractorWorkerResult>;
declare const _default: typeof extractRoutes;
export default _default;
