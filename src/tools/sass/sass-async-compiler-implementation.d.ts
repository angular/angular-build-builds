/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import type { CompileResult, StringOptions } from 'sass-embedded';
import { type SassServiceImplementation } from './sass-service';
/**
 * A Sass renderer implementation that uses the persistent Dart Sass embedded compiler
 * daemon (`sass-embedded`) communicating over standard input/output with protocol buffers.
 */
export declare class SassAsyncCompilerImplementation implements SassServiceImplementation {
    #private;
    /**
     * Provides information about the Sass implementation.
     * This mimics enough of the `sass-embedded` value to be used with the `sass-loader`.
     */
    get info(): string;
    /**
     * The synchronous render function is not used by the `sass-loader`.
     */
    compileString(): never;
    /**
     * Asynchronously request a Sass stylesheet to be rendered using the native embedded compiler.
     *
     * @param source The contents to compile.
     * @param options The `sass-embedded` options to use when rendering the stylesheet.
     */
    compileStringAsync(source: string, options: StringOptions<'async'>): Promise<CompileResult>;
    /**
     * Shutdown the native embedded Sass compiler daemon.
     * @returns A void promise that resolves when closing is complete.
     */
    close(): Promise<void>;
}
