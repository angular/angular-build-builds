"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.INDEX_HTML_SERVER = exports.INDEX_HTML_CSR = void 0;
exports.normalizeOptions = normalizeOptions;
exports.getLocaleBaseHref = getLocaleBaseHref;
const node_fs_1 = require("node:fs");
const promises_1 = require("node:fs/promises");
const node_module_1 = require("node:module");
const node_path_1 = __importDefault(require("node:path"));
const utils_1 = require("../../utils");
const color_1 = require("../../utils/color");
const environment_options_1 = require("../../utils/environment-options");
const i18n_options_1 = require("../../utils/i18n-options");
const normalize_cache_1 = require("../../utils/normalize-cache");
const postcss_configuration_1 = require("../../utils/postcss-configuration");
const project_metadata_1 = require("../../utils/project-metadata");
const url_1 = require("../../utils/url");
const schema_1 = require("./schema");
/**
 * The filename for the client-side rendered HTML template.
 * This template is used for client-side rendering (CSR) in a web application.
 */
exports.INDEX_HTML_CSR = 'index.csr.html';
/**
 * The filename for the server-side rendered HTML template.
 * This template is used for server-side rendering (SSR) in a web application.
 */
exports.INDEX_HTML_SERVER = 'index.server.html';
/**
 * Normalize the user provided options by creating full paths for all path based options
 * and converting multi-form options into a single form that can be directly used
 * by the build process.
 *
 * @param context The context for current builder execution.
 * @param projectName The name of the project for the current execution.
 * @param options An object containing the options to use for the build.
 * @param plugins An optional array of programmatically supplied build plugins.
 * @returns An object containing normalized options required to perform the build.
 */
// eslint-disable-next-line max-lines-per-function
async function normalizeOptions(context, projectName, options, extensions) {
    // If not explicitly set, default to the Node.js process argument
    const preserveSymlinks = options.preserveSymlinks ?? process.execArgv.includes('--preserve-symlinks');
    // Setup base paths based on workspace root and project information
    const workspaceRoot = preserveSymlinks
        ? context.workspaceRoot
        : // NOTE: promises.realpath should not be used here since it uses realpath.native which
            // can cause case conversion and other undesirable behavior on Windows systems.
            // ref: https://github.com/nodejs/node/issues/7726
            (0, node_fs_1.realpathSync)(context.workspaceRoot);
    const projectMetadata = await context.getProjectMetadata(projectName);
    const { projectRoot, projectSourceRoot } = (0, project_metadata_1.getProjectRootPaths)(workspaceRoot, projectMetadata);
    // Gather persistent caching option and provide a project specific cache location
    const cacheOptions = (0, normalize_cache_1.normalizeCacheOptions)(projectMetadata, workspaceRoot);
    cacheOptions.path = node_path_1.default.join(cacheOptions.path, projectName);
    const i18nOptions = (0, i18n_options_1.createI18nOptions)(projectMetadata, options.localize, context.logger, !!options.ssr);
    i18nOptions.duplicateTranslationBehavior = options.i18nDuplicateTranslation;
    i18nOptions.missingTranslationBehavior = options.i18nMissingTranslation;
    if (options.forceI18nFlatOutput) {
        i18nOptions.flatOutput = true;
    }
    const entryPoints = normalizeEntryPoints(workspaceRoot, projectSourceRoot, options.browser, options.entryPoints);
    const tsconfig = node_path_1.default.join(workspaceRoot, options.tsConfig);
    const optimizationOptions = (0, utils_1.normalizeOptimization)(options.optimization);
    const sourcemapOptions = (0, utils_1.normalizeSourceMaps)(options.sourceMap ?? false);
    const assets = options.assets?.length
        ? (0, utils_1.normalizeAssetPatterns)(options.assets, workspaceRoot, projectRoot, projectSourceRoot)
        : undefined;
    let fileReplacements;
    if (options.fileReplacements) {
        for (const replacement of options.fileReplacements) {
            const fileReplaceWith = node_path_1.default.join(workspaceRoot, replacement.with);
            try {
                await (0, promises_1.access)(fileReplaceWith, promises_1.constants.F_OK);
            }
            catch {
                throw new Error(`The ${fileReplaceWith} path in file replacements does not exist.`);
            }
            fileReplacements ??= {};
            fileReplacements[node_path_1.default.join(workspaceRoot, replacement.replace)] = fileReplaceWith;
        }
    }
    let loaderExtensions;
    if (options.loader) {
        for (const [extension, value] of Object.entries(options.loader)) {
            if (extension[0] !== '.' || /\.[cm]?[jt]sx?$/.test(extension)) {
                continue;
            }
            if (value !== 'text' &&
                value !== 'binary' &&
                value !== 'file' &&
                value !== 'dataurl' &&
                value !== 'base64' &&
                value !== 'empty') {
                continue;
            }
            loaderExtensions ??= {};
            loaderExtensions[extension] = value;
        }
    }
    // Validate prerender and ssr options when using the outputMode
    if (options.outputMode === schema_1.OutputMode.Server) {
        if (!options.server) {
            throw new Error('The "server" option is required when "outputMode" is set to "server".');
        }
        if (typeof options.ssr === 'boolean' || !options.ssr?.entry) {
            throw new Error('The "ssr.entry" option is required when "outputMode" is set to "server".');
        }
    }
    if (options.outputMode) {
        if (!options.server) {
            options.ssr = false;
        }
        if (options.prerender !== undefined) {
            context.logger.warn('The "prerender" option is not considered when "outputMode" is specified.');
        }
        options.prerender = !!options.server;
        if (options.appShell !== undefined) {
            context.logger.warn('The "appShell" option is not considered when "outputMode" is specified.');
        }
    }
    // A configuration file can exist in the project or workspace root
    const searchDirectories = await (0, postcss_configuration_1.generateSearchDirectories)([projectRoot, workspaceRoot]);
    const postcssConfiguration = await (0, postcss_configuration_1.loadPostcssConfiguration)(searchDirectories);
    // Skip tailwind configuration if postcss is customized
    const tailwindConfiguration = postcssConfiguration
        ? undefined
        : await getTailwindConfig(searchDirectories, workspaceRoot, context);
    let serverEntryPoint;
    if (typeof options.server === 'string') {
        if (options.server === '') {
            throw new Error('The "server" option cannot be an empty string.');
        }
        serverEntryPoint = node_path_1.default.join(workspaceRoot, options.server);
    }
    let prerenderOptions;
    if (options.prerender) {
        const { discoverRoutes = true, routesFile = undefined } = options.prerender === true ? {} : options.prerender;
        prerenderOptions = {
            discoverRoutes,
            routesFile: routesFile && node_path_1.default.join(workspaceRoot, routesFile),
        };
    }
    let ssrOptions;
    if (options.ssr === true) {
        ssrOptions = {};
    }
    else if (typeof options.ssr === 'object') {
        const { entry, experimentalPlatform = schema_1.ExperimentalPlatform.Node } = options.ssr;
        ssrOptions = {
            entry: entry && node_path_1.default.join(workspaceRoot, entry),
            platform: experimentalPlatform,
        };
    }
    let appShellOptions;
    if (options.appShell) {
        appShellOptions = {
            route: 'shell',
        };
    }
    const outputPath = options.outputPath ?? node_path_1.default.join(workspaceRoot, 'dist', projectName);
    const outputOptions = {
        browser: 'browser',
        server: 'server',
        media: 'media',
        ...(typeof outputPath === 'string' ? undefined : outputPath),
        base: (0, project_metadata_1.normalizeDirectoryPath)(node_path_1.default.resolve(workspaceRoot, typeof outputPath === 'string' ? outputPath : outputPath.base)),
        clean: options.deleteOutputPath ?? true,
        // For app-shell and SSG server files are not required by users.
        // Omit these when SSR is not enabled.
        ignoreServer: ((ssrOptions === undefined || serverEntryPoint === undefined) &&
            options.outputMode === undefined) ||
            options.outputMode === schema_1.OutputMode.Static,
    };
    const outputNames = {
        bundles: options.outputHashing === schema_1.OutputHashing.All || options.outputHashing === schema_1.OutputHashing.Bundles
            ? '[name]-[hash]'
            : '[name]',
        media: outputOptions.media +
            (options.outputHashing === schema_1.OutputHashing.All || options.outputHashing === schema_1.OutputHashing.Media
                ? '/[name]-[hash]'
                : '/[name]'),
    };
    const globalStyles = normalizeGlobalEntries(options.styles, 'styles');
    const globalScripts = normalizeGlobalEntries(options.scripts, 'scripts');
    let indexHtmlOptions;
    // index can never have a value of `true` but in the schema it's of type `boolean`.
    if (typeof options.index !== 'boolean') {
        let indexInput;
        let indexOutput;
        // The output file will be created within the configured output path
        if (typeof options.index === 'string') {
            indexInput = indexOutput = node_path_1.default.join(workspaceRoot, options.index);
        }
        else if (typeof options.index === 'undefined') {
            indexInput = node_path_1.default.join(projectSourceRoot, 'index.html');
            indexOutput = 'index.html';
        }
        else {
            indexInput = node_path_1.default.join(workspaceRoot, options.index.input);
            indexOutput = options.index.output || 'index.html';
        }
        /**
         * If SSR is activated, create a distinct entry file for the `index.html`.
         * This is necessary because numerous server/cloud providers automatically serve the `index.html` as a static file
         * if it exists (handling SSG).
         *
         * For instance, accessing `foo.com/` would lead to `foo.com/index.html` being served instead of hitting the server.
         *
         * This approach can also be applied to service workers, where the `index.csr.html` is served instead of the prerendered `index.html`.
         */
        const indexBaseName = node_path_1.default.basename(indexOutput);
        indexOutput =
            (ssrOptions || prerenderOptions) && indexBaseName === 'index.html'
                ? exports.INDEX_HTML_CSR
                : indexBaseName;
        indexHtmlOptions = {
            input: indexInput,
            output: indexOutput,
            insertionOrder: [
                ['polyfills', true],
                ...globalStyles.filter((s) => s.initial).map((s) => [s.name, false]),
                ...globalScripts.filter((s) => s.initial).map((s) => [s.name, false]),
                ['main', true],
                // [name, esm]
            ],
            transformer: extensions?.indexHtmlTransformer,
            // Preload initial defaults to true
            preloadInitial: typeof options.index !== 'object' || (options.index.preloadInitial ?? true),
        };
    }
    if (appShellOptions || ssrOptions || prerenderOptions) {
        if (!serverEntryPoint) {
            throw new Error('The "server" option is required when enabling "ssr", "prerender" or "app-shell".');
        }
        if (!indexHtmlOptions) {
            throw new Error('The "index" option cannot be set to false when enabling "ssr", "prerender" or "app-shell".');
        }
    }
    const autoCsp = options.security?.autoCsp;
    const security = {
        autoCsp: autoCsp
            ? {
                unsafeEval: autoCsp === true ? false : !!autoCsp.unsafeEval,
            }
            : undefined,
    };
    // Initial options to keep
    const { allowedCommonJsDependencies, aot = true, baseHref, crossOrigin, externalDependencies, extractLicenses, inlineStyleLanguage = 'css', outExtension, serviceWorker, poll, polyfills, statsJson, outputMode, stylePreprocessorOptions, subresourceIntegrity, verbose, watch, progress = true, externalPackages, namedChunks, budgets, deployUrl, clearScreen, define, partialSSRBuild = false, externalRuntimeStyles, instrumentForCoverage, } = options;
    // Return all the normalized options
    return {
        advancedOptimizations: !!aot && optimizationOptions.scripts,
        allowedCommonJsDependencies,
        baseHref,
        cacheOptions,
        crossOrigin,
        externalDependencies: normalizeExternals(externalDependencies),
        externalPackages: typeof externalPackages === 'object'
            ? {
                ...externalPackages,
                exclude: normalizeExternals(externalPackages.exclude),
            }
            : externalPackages,
        extractLicenses,
        inlineStyleLanguage,
        jit: !aot,
        stats: !!statsJson,
        polyfills: polyfills === undefined || Array.isArray(polyfills) ? polyfills : [polyfills],
        poll,
        progress,
        preserveSymlinks,
        stylePreprocessorOptions,
        subresourceIntegrity,
        serverEntryPoint,
        prerenderOptions,
        appShellOptions,
        outputMode,
        ssrOptions,
        verbose,
        watch,
        workspaceRoot,
        entryPoints,
        optimizationOptions,
        outputOptions,
        outExtension,
        sourcemapOptions,
        tsconfig,
        projectRoot,
        assets,
        outputNames,
        fileReplacements,
        globalStyles,
        globalScripts,
        serviceWorker: serviceWorker
            ? node_path_1.default.join(workspaceRoot, typeof serviceWorker === 'string' ? serviceWorker : 'src/ngsw-config.json')
            : undefined,
        indexHtmlOptions,
        tailwindConfiguration,
        postcssConfiguration,
        i18nOptions,
        namedChunks,
        budgets: budgets?.length ? budgets : undefined,
        publicPath: deployUrl,
        plugins: extensions?.codePlugins?.length ? extensions?.codePlugins : undefined,
        loaderExtensions,
        jsonLogs: environment_options_1.useJSONBuildLogs,
        colors: (0, color_1.supportColor)(),
        clearScreen,
        define,
        partialSSRBuild: environment_options_1.usePartialSsrBuild || partialSSRBuild,
        externalRuntimeStyles: aot && externalRuntimeStyles,
        instrumentForCoverage,
        security,
        templateUpdates: !!options.templateUpdates,
        incrementalResults: !!options.incrementalResults,
        customConditions: options.conditions,
        frameworkVersion: await findFrameworkVersion(projectRoot),
    };
}
async function getTailwindConfig(searchDirectories, workspaceRoot, context) {
    const tailwindConfigurationPath = (0, postcss_configuration_1.findTailwindConfiguration)(searchDirectories);
    if (!tailwindConfigurationPath) {
        return undefined;
    }
    // Create a node resolver from the configuration file
    const resolver = (0, node_module_1.createRequire)(tailwindConfigurationPath);
    try {
        return {
            file: tailwindConfigurationPath,
            package: resolver.resolve('tailwindcss'),
        };
    }
    catch {
        const relativeTailwindConfigPath = node_path_1.default.relative(workspaceRoot, tailwindConfigurationPath);
        context.logger.warn(`Tailwind CSS configuration file found (${relativeTailwindConfigPath})` +
            ` but the 'tailwindcss' package is not installed.` +
            ` To enable Tailwind CSS, please install the 'tailwindcss' package.`);
    }
    return undefined;
}
/**
 * Normalize entry point options. To maintain compatibility with the legacy browser builder, we need a single `browser`
 * option which defines a single entry point. However, we also want to support multiple entry points as an internal option.
 * The two options are mutually exclusive and if `browser` is provided it will be used as the sole entry point.
 * If `entryPoints` are provided, they will be used as the set of entry points.
 *
 * @param workspaceRoot Path to the root of the Angular workspace.
 * @param browser The `browser` option pointing at the application entry point. While required per the schema file, it may be omitted by
 *     programmatic usages of `browser-esbuild`.
 * @param entryPoints Set of entry points to use if provided.
 * @returns An object mapping entry point names to their file paths.
 */
function normalizeEntryPoints(workspaceRoot, projectSourceRoot, browser, entryPoints) {
    if (browser === '') {
        throw new Error('`browser` option cannot be an empty string.');
    }
    // `browser` and `entryPoints` are mutually exclusive.
    if (browser && entryPoints) {
        throw new Error('Only one of `browser` or `entryPoints` may be provided.');
    }
    if (browser) {
        // Use `browser` alone.
        return { 'main': node_path_1.default.join(workspaceRoot, browser) };
    }
    else if (!entryPoints) {
        // Default browser entry if no explicit entry points
        return { 'main': node_path_1.default.join(projectSourceRoot, 'main.ts') };
    }
    else if (entryPoints instanceof Map) {
        return Object.fromEntries(Array.from(entryPoints.entries(), ([name, entryPoint]) => {
            // Get the full file path to a relative entry point input. Leave bare specifiers alone so they are resolved as modules.
            const isRelativePath = entryPoint.startsWith('.');
            const entryPointPath = isRelativePath ? node_path_1.default.join(workspaceRoot, entryPoint) : entryPoint;
            return [name, entryPointPath];
        }));
    }
    else {
        // Use `entryPoints` alone.
        const entryPointPaths = {};
        for (const entryPoint of entryPoints) {
            const parsedEntryPoint = node_path_1.default.parse(entryPoint);
            // Use the input file path without an extension as the "name" of the entry point dictating its output location.
            // Relative entry points are generated at the same relative path in the output directory.
            // Absolute entry points are always generated with the same file name in the root of the output directory. This includes absolute
            // paths pointing at files actually within the workspace root.
            const entryPointName = node_path_1.default.isAbsolute(entryPoint)
                ? parsedEntryPoint.name
                : node_path_1.default.join(parsedEntryPoint.dir, parsedEntryPoint.name);
            // Get the full file path to a relative entry point input. Leave bare specifiers alone so they are resolved as modules.
            const isRelativePath = entryPoint.startsWith('.');
            const entryPointPath = isRelativePath ? node_path_1.default.join(workspaceRoot, entryPoint) : entryPoint;
            // Check for conflicts with previous entry points.
            const existingEntryPointPath = entryPointPaths[entryPointName];
            if (existingEntryPointPath) {
                throw new Error(`\`${existingEntryPointPath}\` and \`${entryPointPath}\` both output to the same location \`${entryPointName}\`.` +
                    ' Rename or move one of the files to fix the conflict.');
            }
            entryPointPaths[entryPointName] = entryPointPath;
        }
        return entryPointPaths;
    }
}
function normalizeGlobalEntries(rawEntries, defaultName) {
    if (!rawEntries?.length) {
        return [];
    }
    const bundles = new Map();
    for (const rawEntry of rawEntries) {
        let entry;
        if (typeof rawEntry === 'string') {
            // string entries use default bundle name and inject values
            entry = { input: rawEntry };
        }
        else {
            entry = rawEntry;
        }
        const { bundleName, input, inject = true } = entry;
        // Non-injected entries default to the file name
        const name = bundleName || (inject ? defaultName : node_path_1.default.basename(input, node_path_1.default.extname(input)));
        const existing = bundles.get(name);
        if (!existing) {
            bundles.set(name, { name, files: [input], initial: inject });
            continue;
        }
        if (existing.initial !== inject) {
            throw new Error(`The "${name}" bundle is mixing injected and non-injected entries. ` +
                'Verify that the project options are correct.');
        }
        existing.files.push(input);
    }
    return [...bundles.values()];
}
function getLocaleBaseHref(baseHref = '', i18n, locale) {
    if (i18n.flatOutput) {
        return undefined;
    }
    const localeData = i18n.locales[locale];
    if (!localeData) {
        return undefined;
    }
    const baseHrefSuffix = localeData.baseHref ?? localeData.subPath + '/';
    return baseHrefSuffix !== '' ? (0, url_1.urlJoin)(baseHref, baseHrefSuffix) : undefined;
}
/**
 * Normalizes an array of external dependency paths by ensuring that
 * wildcard patterns (`/*`) are removed from package names.
 *
 * This avoids the need to handle this normalization repeatedly in our plugins,
 * as esbuild already treats `--external:@foo/bar` as implicitly including
 * `--external:@foo/bar/*`. By standardizing the input, we ensure consistency
 * and reduce redundant checks across our plugins.
 *
 * @param value - An optional array of dependency paths to normalize.
 * @returns A new array with wildcard patterns removed from package names, or `undefined` if input is `undefined`.
 */
function normalizeExternals(value) {
    if (!value) {
        return undefined;
    }
    return [
        ...new Set(value.map((d) => 
        // remove "/*" wildcard in the end if provided string is not path-like
        d.endsWith('/*') && !/^\.{0,2}\//.test(d) ? d.slice(0, -2) : d)),
    ];
}
async function findFrameworkVersion(projectRoot) {
    // Create a custom require function for ESM compliance.
    // NOTE: The trailing slash is significant.
    const projectResolve = (0, node_module_1.createRequire)(projectRoot + '/').resolve;
    try {
        const manifestPath = projectResolve('@angular/core/package.json');
        const manifestData = await (0, promises_1.readFile)(manifestPath, 'utf-8');
        const manifestObject = JSON.parse(manifestData);
        const version = manifestObject.version;
        return version;
    }
    catch {
        throw new Error('Error: It appears that "@angular/core" is missing as a dependency. Please ensure it is included in your project.');
    }
}
