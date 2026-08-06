/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import type { DecodedSourceMap } from '@ampproject/remapping';
export interface OxcLinkerOptions {
    sourcemap?: boolean;
    jit?: boolean;
    skipCheck?: boolean;
}
/**
 * Executes Angular partial declaration linking on the specified JavaScript file
 * using `oxc-parser` and `magic-string`.
 *
 * @param filename The full path to the file.
 * @param code The source code content.
 * @param options Linker options (sourcemap, jit, skipCheck).
 * @returns An object containing the transformed code and optional source map.
 */
export declare function linkWithOxc(filename: string, code: string, options?: OxcLinkerOptions): {
    code: string;
    map: DecodedSourceMap | undefined;
};
