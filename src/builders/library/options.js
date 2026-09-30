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
exports.normalizeLibraryOptions = normalizeLibraryOptions;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const utils_1 = require("../../utils");
const color_1 = require("../../utils/color");
const error_1 = require("../../utils/error");
const normalize_cache_1 = require("../../utils/normalize-cache");
const path_1 = require("../../utils/path");
const postcss_configuration_1 = require("../../utils/postcss-configuration");
const project_metadata_1 = require("../../utils/project-metadata");
const entry_points_1 = require("./pipeline/entry-points");
async function normalizeLibraryOptions(context, projectName, options) {
    const { workspaceRoot } = context;
    const projectMetadata = await context.getProjectMetadata(projectName);
    const { projectRoot, projectSourceRoot } = (0, project_metadata_1.getProjectRootPaths)(workspaceRoot, projectMetadata);
    const outputPath = options.outputPath ?? node_path_1.default.join(workspaceRoot, 'dist', projectName);
    const resolvedOutputPath = node_path_1.default.resolve(workspaceRoot, outputPath);
    if (resolvedOutputPath === projectRoot ||
        (0, path_1.isSubDirectory)(resolvedOutputPath, projectRoot) ||
        (0, path_1.isSubDirectory)(projectRoot, resolvedOutputPath)) {
        throw new Error(`The 'outputPath' (${resolvedOutputPath}) cannot be the project root, ` +
            `contain the project root, or be located within the project root.`);
    }
    const { tsConfig, assets: rawAssets, stylePreprocessorOptions, inlineStyleLanguage = 'css', compilationMode = 'partial', declarationMap = false, allowedNonPeerDependencies: rawAllowedNonPeerDependencies = [], keepLifecycleScripts = false, watch = false, poll, preserveSymlinks = process.execArgv.includes('--preserve-symlinks'), deleteOutputPath = true, progress = true, clearScreen, } = options;
    const resolvedTsConfigPath = node_path_1.default.resolve(workspaceRoot, tsConfig);
    const packageJsonPath = node_path_1.default.join(projectRoot, 'package.json');
    let packageJson;
    try {
        const packageJsonContent = await promises_1.default.readFile(packageJsonPath, 'utf8');
        packageJson = JSON.parse(packageJsonContent);
    }
    catch (error) {
        (0, error_1.assertIsError)(error);
        throw new Error(`Failed to read 'package.json' at '${packageJsonPath}': ${error.message}`, {
            cause: error,
        });
    }
    const { name: packageName } = packageJson;
    if (!packageName) {
        throw new Error(`The package.json at '${packageJsonPath}' must contain a 'name'.`);
    }
    const entryPoints = normalizeEntryPoints(packageJson.exports, projectRoot, packageJsonPath, packageName);
    const allowedNonPeerDependencies = [/^tslib$/];
    for (const pattern of rawAllowedNonPeerDependencies) {
        try {
            allowedNonPeerDependencies.push(new RegExp(pattern));
        }
        catch (error) {
            (0, error_1.assertIsError)(error);
            throw new Error(`Invalid regular expression '${pattern}' in 'allowedNonPeerDependencies' for project '${projectName}': ${error.message}`, { cause: error });
        }
    }
    const defaultAssets = [
        { glob: 'LICENSE*', input: projectRoot, output: '.' },
        { glob: 'README.md', input: projectRoot, output: '.' },
    ];
    for (const entryPoint of entryPoints.values()) {
        if (entryPoint.isPrimary) {
            continue;
        }
        defaultAssets.push({
            glob: 'README.md',
            input: node_path_1.default.dirname(entryPoint.entryFilePath),
            output: entryPoint.name,
        });
    }
    const assets = (0, utils_1.normalizeAssetPatterns)([...defaultAssets, ...(rawAssets ?? [])], workspaceRoot, projectRoot, projectSourceRoot);
    const cacheOptions = (0, normalize_cache_1.normalizeCacheOptions)(projectMetadata, workspaceRoot);
    const styleIncludePaths = (stylePreprocessorOptions?.includePaths ?? []).map((p) => node_path_1.default.resolve(workspaceRoot, p));
    const searchDirectories = await (0, postcss_configuration_1.generateSearchDirectories)([projectRoot, workspaceRoot]);
    const postcssConfiguration = await (0, postcss_configuration_1.loadPostcssConfiguration)(searchDirectories);
    const tailwindConfiguration = postcssConfiguration
        ? undefined
        : await (0, postcss_configuration_1.getTailwindConfig)(searchDirectories, workspaceRoot, context.logger);
    return {
        workspaceRoot,
        projectRoot,
        packageName,
        packageJson,
        outputPath: resolvedOutputPath,
        deleteOutputPath,
        packageJsonPath,
        tsConfigPath: resolvedTsConfigPath,
        entryPoints,
        inlineStyleLanguage,
        styleIncludePaths,
        sass: stylePreprocessorOptions?.sass,
        assets,
        compilationMode,
        declarationMap,
        allowedNonPeerDependencies,
        keepLifecycleScripts,
        watch,
        poll,
        preserveSymlinks,
        progress,
        clearScreen,
        cacheOptions,
        colors: (0, color_1.supportColor)(),
        postcssConfiguration,
        tailwindConfiguration,
    };
}
/**
 * Normalizes a single entry point specification.
 *
 * @param key The entry point key from package.json exports (e.g. '.' or './testing').
 * @param posixKey Normalized POSIX key without trailing slashes.
 * @param isPrimary Whether this is the primary entry point.
 * @param targetPath The relative file path string from exports.
 * @param projectRoot The library project root directory.
 * @param packageName The root package name (e.g. `@my/lib`).
 * @returns The normalized entry point descriptor.
 */
function normalizeEntryPoint(key, posixKey, isPrimary, targetPath, projectRoot, packageName) {
    const name = isPrimary
        ? '.'
        : posixKey[0] === '.' && posixKey[1] === '/'
            ? posixKey.slice(2)
            : posixKey;
    if (name !== '.' && (node_path_1.default.posix.isAbsolute(name) || name.includes('..'))) {
        throw new Error(`Invalid entry point key '${key}'. Entry point keys must be relative subpaths without '..' (e.g. './testing').`);
    }
    const subpath = isPrimary ? '.' : `./${name}`;
    const displayName = isPrimary ? packageName : `${packageName}/${name}`;
    const bundleName = (0, entry_points_1.getEntryPointBundleName)(packageName, name);
    const entryFilePath = node_path_1.default.resolve(projectRoot, targetPath);
    if (!/(?<!\.d)\.(?:ts|mts)$/.test(entryFilePath)) {
        throw new Error(`Entry point '${key}' file path must be a TypeScript file ('.ts' or '.mts'): '${entryFilePath}'.`);
    }
    return {
        subpath,
        name,
        displayName,
        bundleName,
        entryFilePath,
        isPrimary,
    };
}
/**
 * Normalizes all entry points from the library's `package.json` `exports` field.
 *
 * @param rawExports The `exports` field from `package.json`.
 * @param projectRoot The library project root directory.
 * @param packageJsonPath Path to `package.json` for error reporting.
 * @param packageName The root package name (e.g. `@my/lib`).
 * @returns A Map of normalized entry points keyed by name.
 */
function normalizeEntryPoints(rawExports, projectRoot, packageJsonPath, packageName) {
    if (!rawExports || (typeof rawExports !== 'string' && typeof rawExports !== 'object')) {
        throw new Error(`The 'package.json' at '${packageJsonPath}' must contain an 'exports' field defining the primary entry point ('.').`);
    }
    const exportsRecord = typeof rawExports === 'string' ? { '.': rawExports } : rawExports;
    const entryPoints = new Map();
    let hasPrimary = false;
    for (const [key, value] of Object.entries(exportsRecord)) {
        let target;
        if (typeof value === 'string') {
            target = value;
        }
        else if (typeof value === 'object' &&
            value !== null &&
            !Array.isArray(value) &&
            typeof value['default'] === 'string') {
            target = value['default'];
        }
        const posixKey = (0, path_1.toPosixPath)(key).replace(/\/+$/, '');
        const isPrimary = posixKey === '.' || posixKey === '';
        if (!target) {
            if (isPrimary) {
                throw new Error(`The primary entry point '.' in '${packageJsonPath}' must specify a string path ` +
                    `or a 'default' condition pointing to a TypeScript file.`);
            }
            // Non-JS/TS conditional export (e.g., sass/style-only subpath); preserve in package.json without compiling.
            continue;
        }
        if (!isPrimary && !/\.m?ts$/.test(target)) {
            // Static asset, stylesheet, or package.json export; preserve in package.json without compiling.
            continue;
        }
        const entryPoint = normalizeEntryPoint(key, posixKey, isPrimary, target, projectRoot, packageName);
        if (entryPoints.has(entryPoint.name)) {
            throw new Error(`Duplicate entry point detected: '${key}' resolves to the same name ('${entryPoint.name}') as an existing entry point.`);
        }
        entryPoints.set(entryPoint.name, entryPoint);
        if (entryPoint.isPrimary) {
            hasPrimary = true;
        }
    }
    if (!hasPrimary) {
        throw new Error(`The 'exports' field in '${packageJsonPath}' must contain a primary entry point with key '.'.`);
    }
    return entryPoints;
}
//# sourceMappingURL=options.js.map