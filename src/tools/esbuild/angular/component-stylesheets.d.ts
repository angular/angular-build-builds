/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { OutputFile } from 'esbuild';
import { BundleStylesheetOptions } from '../stylesheets/bundle-options';
/**
 * Bundles component stylesheets. A stylesheet can be either an inline stylesheet that
 * is contained within the Component's metadata definition or an external file referenced
 * from the Component's metadata definition.
 */
export declare class ComponentStylesheetBundler {
    #private;
    private readonly options;
    private readonly defaultInlineLanguage;
    private readonly incremental;
    /**
     *
     * @param options An object containing the stylesheet bundling options.
     * @param cache A load result cache to use when bundling.
     */
    constructor(options: BundleStylesheetOptions, defaultInlineLanguage: string, incremental: boolean);
    bundleFile(entry: string, externalId?: string | boolean): Promise<{
        errors: import("esbuild").Message[] | undefined;
        warnings: import("esbuild").Message[];
        contents: string;
        outputFiles: OutputFile[];
        metafile: import("esbuild").Metafile | undefined;
        referencedFiles: Set<string> | undefined;
    }>;
    bundleInline(data: string, filename: string, language?: string, externalId?: string): Promise<{
        errors: import("esbuild").Message[] | undefined;
        warnings: import("esbuild").Message[];
        contents: string;
        outputFiles: OutputFile[];
        metafile: import("esbuild").Metafile | undefined;
        referencedFiles: Set<string> | undefined;
    }>;
    /**
     * Invalidates both file and inline based component style bundling state for a set of modified files.
     * @param files The group of files that have been modified
     * @returns An array of file based stylesheet entries if any were invalidated; otherwise, undefined.
     */
    invalidate(files: Iterable<string>): string[] | undefined;
    dispose(): Promise<void>;
    private extractResult;
}
