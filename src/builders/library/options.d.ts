/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import type { BuilderContext } from '@angular-devkit/architect';
import type { Schema as LibraryBuilderOptions } from './schema';
import type { NormalizedLibraryOptions } from './types';
/**
 * Normalizes raw library builder options into {@link NormalizedLibraryOptions} with all
 * file and directory paths normalized to POSIX format.
 *
 * @param context The Architect builder context.
 * @param projectName The name of the library project.
 * @param options The raw library builder schema options.
 * @returns A promise resolving to the normalized library options.
 */
export declare function normalizeLibraryOptions(context: BuilderContext, projectName: string, options: LibraryBuilderOptions): Promise<NormalizedLibraryOptions>;
