/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { OutputMode } from '../../builders/application/schema';
import { RoutersExtractorWorkerResult } from './models';
export interface ExtractRoutesOptions {
    outputMode?: OutputMode;
}
/** Renders an application based on a provided options. */
declare function extractRoutes({ outputMode, }: ExtractRoutesOptions): Promise<RoutersExtractorWorkerResult>;
declare const _default: typeof extractRoutes;
export default _default;
