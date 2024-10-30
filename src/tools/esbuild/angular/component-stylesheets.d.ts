/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { BuildOutputFile } from '../bundler-context';
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
    /**
     * Bundle a file-based component stylesheet for use within an AOT compiled Angular application.
     * @param entry The file path of the stylesheet.
     * @param externalId Either an external identifier string for initial bundling or a boolean for rebuilds, if external.
     * @param direct If true, the output will be used directly by the builder; false if used inside the compiler plugin.
     * @returns A component bundle result object.
     */
    bundleFile(entry: string, externalId?: string | boolean, direct?: boolean): Promise<{
        errors: import("esbuild-wasm/lib/main").Message[];
        warnings: import("esbuild-wasm/lib/main").Message[];
        referencedFiles: Set<string> | undefined;
        contents?: undefined;
        outputFiles?: undefined;
        metafile?: undefined;
        externalImports?: undefined;
        initialFiles?: undefined;
    } | {
        errors: undefined;
        warnings: import("esbuild-wasm/lib/main").Message[];
        contents: string;
        outputFiles: BuildOutputFile[];
        metafile: import("esbuild-wasm/lib/main").Metafile;
        referencedFiles: Set<string> | undefined;
        externalImports: {
            server?: Set<string>;
            browser?: Set<string>;
        };
        initialFiles: Map<any, any>;
    }>;
    bundleInline(data: string, filename: string, language?: string, externalId?: string): Promise<{
        errors: import("esbuild-wasm/lib/main").Message[];
        warnings: import("esbuild-wasm/lib/main").Message[];
        referencedFiles: Set<string> | undefined;
        contents?: undefined;
        outputFiles?: undefined;
        metafile?: undefined;
        externalImports?: undefined;
        initialFiles?: undefined;
    } | {
        errors: undefined;
        warnings: import("esbuild-wasm/lib/main").Message[];
        contents: string;
        outputFiles: BuildOutputFile[];
        metafile: import("esbuild-wasm/lib/main").Metafile;
        referencedFiles: Set<string> | undefined;
        externalImports: {
            server?: Set<string>;
            browser?: Set<string>;
        };
        initialFiles: Map<any, any>;
    }>;
    /**
     * Invalidates both file and inline based component style bundling state for a set of modified files.
     * @param files The group of files that have been modified
     * @returns An array of file based stylesheet entries if any were invalidated; otherwise, undefined.
     */
    invalidate(files: Iterable<string>): string[] | undefined;
    collectReferencedFiles(): string[];
    dispose(): Promise<void>;
    private extractResult;
}
