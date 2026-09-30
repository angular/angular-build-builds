/**
 * Library builder target options for Build Architect. Builds an Angular library package
 * conforming to the Angular Package Format (APF).
 */
export type Schema = {
    /**
     * A list of package names allowed in the 'dependencies' and 'optionalDependencies' sections
     * of package.json. Values can be regular expression patterns.
     */
    allowedNonPeerDependencies?: string[];
    /**
     * Define the assets to be copied to the output directory. These assets are copied as-is
     * without any further processing or hashing.
     */
    assets?: AssetPattern[];
    /**
     * Automatically clear the terminal screen during rebuilds.
     */
    clearScreen?: boolean;
    /**
     * Angular compilation mode. Use 'partial' when publishing to npm (APF requirement). Use
     * 'full' only during development or for private, internal monorepo packages that are never
     * published.
     */
    compilationMode?: CompilationMode;
    /**
     * Generates a sourcemap for each corresponding '.d.ts' file.
     */
    declarationMap?: boolean;
    /**
     * Delete the output path before building.
     */
    deleteOutputPath?: boolean;
    /**
     * The stylesheet language to use for the library's inline component styles.
     */
    inlineStyleLanguage?: InlineStyleLanguage;
    /**
     * Enable this to keep the 'scripts' section in the published package.json.
     */
    keepLifecycleScripts?: boolean;
    /**
     * Specify the output directory for the built package, relative to the workspace root.
     */
    outputPath?: string;
    /**
     * Enable and define the file watching poll time period in milliseconds.
     */
    poll?: number;
    /**
     * Do not use the real path when resolving modules. If unset then will default to `true` if
     * NodeJS option --preserve-symlinks is set.
     */
    preserveSymlinks?: boolean;
    /**
     * Log progress to the console while building.
     */
    progress?: boolean;
    /**
     * Options to pass to style preprocessors.
     */
    stylePreprocessorOptions?: StylePreprocessorOptions;
    /**
     * The full path for the TypeScript configuration file, relative to the current workspace
     * root.
     */
    tsConfig: string;
    /**
     * Run build when files change.
     */
    watch?: boolean;
};
export type AssetPattern = AssetPatternClass | string;
export type AssetPatternClass = {
    /**
     * Allow glob patterns to follow symlink directories. This allows subdirectories of the
     * symlink to be searched.
     */
    followSymlinks?: boolean;
    /**
     * The pattern to match.
     */
    glob: string;
    /**
     * An array of globs to ignore.
     */
    ignore?: string[];
    /**
     * The input directory path in which to apply 'glob'. Defaults to the project root.
     */
    input: string;
    /**
     * Absolute path within the output.
     */
    output?: string;
};
/**
 * Angular compilation mode. Use 'partial' when publishing to npm (APF requirement). Use
 * 'full' only during development or for private, internal monorepo packages that are never
 * published.
 */
export declare enum CompilationMode {
    Full = "full",
    Partial = "partial"
}
/**
 * The stylesheet language to use for the library's inline component styles.
 */
export declare enum InlineStyleLanguage {
    Css = "css",
    Less = "less",
    Sass = "sass",
    Scss = "scss"
}
/**
 * Options to pass to style preprocessors.
 */
export type StylePreprocessorOptions = {
    /**
     * Paths to include. Paths will be resolved to workspace root.
     */
    includePaths?: string[];
    /**
     * Options to pass to the sass preprocessor.
     */
    sass?: Sass;
};
/**
 * Options to pass to the sass preprocessor.
 */
export type Sass = {
    /**
     * A set of deprecations to treat as fatal. If a deprecation warning of any provided type is
     * encountered during compilation, the compiler will error instead. If a Version is
     * provided, then all deprecations that were active in that compiler version will be treated
     * as fatal.
     */
    fatalDeprecations?: string[];
    /**
     * A set of future deprecations to opt into early. Future deprecations passed here will be
     * treated as active by the compiler, emitting warnings as necessary.
     */
    futureDeprecations?: string[];
    /**
     * A set of active deprecations to ignore. If a deprecation warning of any provided type is
     * encountered during compilation, the compiler will ignore it instead.
     */
    silenceDeprecations?: string[];
};
