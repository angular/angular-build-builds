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
const node_path_1 = __importDefault(require("node:path"));
const utils_1 = require("../../utils");
const color_1 = require("../../utils/color");
const error_1 = require("../../utils/error");
const normalize_cache_1 = require("../../utils/normalize-cache");
const path_1 = require("../../utils/path");
const postcss_configuration_1 = require("../../utils/postcss-configuration");
const project_metadata_1 = require("../../utils/project-metadata");
const entry_points_1 = require("./pipeline/entry-points");
const utils_2 = require("./pipeline/utils");
/**
 * Normalizes raw library builder options into {@link NormalizedLibraryOptions} with all
 * file and directory paths normalized to POSIX format.
 *
 * @param context The Architect builder context.
 * @param projectName The name of the library project.
 * @param options The raw library builder schema options.
 * @returns A promise resolving to the normalized library options.
 */
async function normalizeLibraryOptions(context, projectName, options) {
    const workspaceRoot = (0, path_1.toPosixPath)(context.workspaceRoot);
    const projectMetadata = await context.getProjectMetadata(projectName);
    const projectRootPaths = (0, project_metadata_1.getProjectRootPaths)(workspaceRoot, projectMetadata);
    const projectRoot = (0, path_1.toPosixPath)(projectRootPaths.projectRoot);
    const projectSourceRoot = (0, path_1.toPosixPath)(projectRootPaths.projectSourceRoot);
    const { tsConfig, assets: rawAssets, stylePreprocessorOptions, inlineStyleLanguage = 'css', compilationMode, declarationMap, allowedNonPeerDependencies: rawAllowedNonPeerDependencies = [], keepLifecycleScripts = false, watch = false, poll, preserveSymlinks = process.execArgv.includes('--preserve-symlinks'), deleteOutputPath = true, progress = true, clearScreen, } = options;
    const resolvedTsConfigPath = (0, path_1.toPosixPath)(node_path_1.default.resolve(workspaceRoot, tsConfig));
    const packageJsonPath = node_path_1.default.posix.join(projectRoot, 'package.json');
    let packageJson;
    try {
        packageJson = await (0, utils_2.loadPackageJson)(packageJsonPath);
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
    const entryPoints = (0, entry_points_1.normalizeEntryPoints)(packageJson.exports, projectRoot, packageJsonPath, packageName);
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
            input: node_path_1.default.posix.dirname(entryPoint.entryFilePath),
            output: entryPoint.name,
        });
    }
    const assets = (0, utils_1.normalizeAssetPatterns)([...defaultAssets, ...(rawAssets ?? [])], workspaceRoot, projectRoot, projectSourceRoot).map((asset) => ({
        ...asset,
        input: (0, path_1.toPosixPath)(node_path_1.default.resolve(workspaceRoot, asset.input)),
        output: (0, path_1.toPosixPath)(asset.output),
    }));
    const cacheOptions = (0, normalize_cache_1.normalizeCacheOptions)(projectMetadata, workspaceRoot, projectName, context.builder.builderName);
    const styleIncludePaths = (stylePreprocessorOptions?.includePaths ?? []).map((p) => (0, path_1.toPosixPath)(node_path_1.default.resolve(workspaceRoot, p)));
    const searchDirectories = await (0, postcss_configuration_1.generateSearchDirectories)([projectRoot, workspaceRoot]);
    const postcssConfiguration = await (0, postcss_configuration_1.loadPostcssConfiguration)(searchDirectories);
    const tailwindConfiguration = postcssConfiguration
        ? undefined
        : (0, postcss_configuration_1.getTailwindConfig)(searchDirectories, workspaceRoot, context.logger);
    return {
        workspaceRoot,
        projectRoot,
        packageName,
        packageJson,
        outputPath: (0, path_1.toPosixPath)(node_path_1.default.resolve(workspaceRoot, options.outputPath ?? node_path_1.default.posix.join('dist', projectName))),
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
//# sourceMappingURL=options.js.map