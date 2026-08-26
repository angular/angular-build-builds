/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import type { CompileResult, Deprecation, Exception, SourceSpan, StringOptions } from 'sass-embedded';
import { type SassServiceImplementation } from './sass-service';
export interface SerializableVersion {
    major: number;
    minor: number;
    patch: number;
}
export interface SerializableDeprecation extends Omit<Deprecation, 'obsoleteIn' | 'deprecatedIn'> {
    /** The version this deprecation first became active in. */
    deprecatedIn: SerializableVersion | null;
    /** The version this deprecation became obsolete in. */
    obsoleteIn: SerializableVersion | null;
}
export type SerializableWarningMessage = ({
    deprecation: true;
    deprecationType: SerializableDeprecation;
} | {
    deprecation: false;
}) & {
    message: string;
    span?: Omit<SourceSpan, 'url'> & {
        url?: string;
    };
    stack?: string;
};
/**
 * A response from the Sass render Worker containing the result of the operation.
 */
export interface RenderResponseMessage {
    error?: Exception;
    result?: Omit<CompileResult, 'loadedUrls'> & {
        loadedUrls: string[];
    };
    warnings?: SerializableWarningMessage[];
}
/**
 * A Sass renderer implementation that provides an interface that can be used by Webpack's
 * `sass-loader` or as a fallback in environments that do not support native binaries.
 * The implementation uses a Worker thread pool to perform Sass rendering with the pure-JS
 * `sass` package.
 */
export declare class SassWorkerImplementation implements SassServiceImplementation {
    #private;
    private readonly rebase;
    readonly maxThreads: number;
    constructor(rebase?: boolean, maxThreads?: number);
    /**
     * Provides information about the Sass implementation.
     * This mimics enough of the `sass` value to be used with the `sass-loader`.
     */
    get info(): string;
    /**
     * The synchronous render function is not used by the `sass-loader`.
     */
    compileString(): never;
    /**
     * Asynchronously request a Sass stylesheet to be rendered using worker threads.
     *
     * @param source The contents to compile.
     * @param options The Sass options to use when rendering the stylesheet.
     */
    compileStringAsync(source: string, options: StringOptions<'async'>): Promise<CompileResult>;
    /**
     * Shutdown the Sass render worker.
     * Executing this method will stop any pending render requests.
     * @returns A void promise that resolves when closing is complete.
     */
    close(): Promise<void>;
    private processImporters;
}
