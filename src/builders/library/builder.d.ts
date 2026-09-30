/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import type { BuilderContext, BuilderOutput } from '@angular-devkit/architect';
import type { Schema as LibraryBuilderOptions } from './schema';
/**
 * Executes the library builder to compile, bundle, and package an Angular library into the Angular Package Format (APF).
 *
 * @param options The raw builder schema options.
 * @param context The architect builder execution context.
 * @returns An async iterator yielding builder output results.
 */
export declare function executeLibraryBuilder(options: LibraryBuilderOptions, context: BuilderContext & {
    signal?: AbortSignal;
}): AsyncIterableIterator<BuilderOutput>;
