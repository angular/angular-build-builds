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
exports.createAssetMatchers = createAssetMatchers;
exports.collectAssetsToEmit = collectAssetsToEmit;
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const picomatch_1 = __importDefault(require("picomatch"));
const resolve_assets_1 = require("../../../utils/resolve-assets");
const utils_1 = require("./utils");
/**
 * Normalizes a glob pattern to match `tinyglobby` semantics by stripping trailing slashes,
 * expanding directory patterns with `/**`, and normalizing POSIX segments.
 *
 * @param pattern The raw glob pattern string.
 * @returns The normalized POSIX glob pattern.
 */
function normalizeGlobPattern(pattern) {
    let result = pattern.endsWith('/') ? pattern.slice(0, -1) : pattern;
    if (pattern.endsWith('/') || !picomatch_1.default.scan(result).isGlob) {
        result += '/**';
    }
    return node_path_1.default.posix.normalize(result);
}
/**
 * Compiles picomatch matchers and POSIX input prefixes for each asset configuration.
 *
 * @param assets The normalized asset patterns with POSIX input and output paths.
 * @returns An array of compiled asset matcher descriptors.
 */
function createAssetMatchers(assets) {
    return assets.map((asset) => {
        const ignore = [...resolve_assets_1.DEFAULT_ASSET_IGNORE, ...(asset.ignore ?? [])]
            .filter((pattern) => pattern.length > 0)
            .map(normalizeGlobPattern);
        const isMatch = (0, picomatch_1.default)(asset.glob ? node_path_1.default.posix.normalize(asset.glob) : [], {
            dot: true,
            windows: false,
            ignore,
        });
        const prefix = asset.input.endsWith('/') ? asset.input : `${asset.input}/`;
        return { asset, prefix, isMatch };
    });
}
/**
 * Resolves and collects configured library assets to be emitted to or deleted from disk.
 *
 * @param assets The normalized asset patterns with POSIX input and output paths.
 * @param workspaceRoot The workspace root POSIX directory path.
 * @param emittedAssets Map of previously emitted POSIX source file paths.
 * @param modifiedFiles Optional set of modified POSIX file paths for incremental copying in watch mode.
 * @param assetMatchers Optional pre-compiled asset matchers for incremental matching.
 * @returns The collected asset files to emit and delete.
 */
async function collectAssetsToEmit(assets, workspaceRoot, emittedAssets, modifiedFiles, assetMatchers) {
    if (assets.length === 0 || modifiedFiles?.size === 0) {
        return { filesToEmit: [], filesToDelete: [] };
    }
    if (modifiedFiles) {
        const matchers = assetMatchers ?? createAssetMatchers(assets);
        const filesToEmit = new Map();
        const filesToDelete = new Set();
        for (const file of modifiedFiles) {
            let isFileStat;
            let isFileLstat;
            if (!emittedAssets.has(file) && emittedAssets.size > 0) {
                const dirPrefix = file.endsWith('/') ? file : `${file}/`;
                let isDeletedDir;
                for (const emittedFile of emittedAssets.keys()) {
                    if (emittedFile.startsWith(dirPrefix)) {
                        if (!(isDeletedDir ??= !(0, node_fs_1.statSync)(file, { throwIfNoEntry: false })?.isDirectory())) {
                            break;
                        }
                        filesToDelete.add(emittedFile);
                    }
                }
                if (isDeletedDir !== undefined) {
                    continue;
                }
            }
            let matched = false;
            for (let matcherIndex = 0; matcherIndex < matchers.length; matcherIndex++) {
                const { asset, prefix, isMatch } = matchers[matcherIndex];
                if (!file.startsWith(prefix)) {
                    continue;
                }
                const relative = file.slice(prefix.length);
                if (!isMatch(relative)) {
                    continue;
                }
                const isFile = asset.followSymlinks
                    ? (isFileStat ??= (0, node_fs_1.statSync)(file, { throwIfNoEntry: false })?.isFile() ?? false)
                    : (isFileLstat ??= (0, node_fs_1.lstatSync)(file, { throwIfNoEntry: false })?.isFile() ?? false);
                if (!isFile) {
                    continue;
                }
                matched = true;
                const outputFile = (0, utils_1.createDiskOutputFile)(file, node_path_1.default.posix.join(asset.output, relative));
                const existing = filesToEmit.get(outputFile.path);
                if (!existing || matcherIndex >= existing.matcherIndex) {
                    filesToEmit.set(outputFile.path, { file: outputFile, matcherIndex });
                }
            }
            if (emittedAssets.has(file) && !matched) {
                filesToDelete.add(file);
            }
        }
        return {
            filesToEmit: Array.from(filesToEmit.values(), ({ file }) => file),
            filesToDelete: Array.from(filesToDelete),
        };
    }
    const resolvedAssets = await (0, resolve_assets_1.resolveAssets)(assets, workspaceRoot);
    const filesToEmit = new Map();
    for (const { source, destination } of resolvedAssets) {
        const outputFile = (0, utils_1.createDiskOutputFile)(source, destination);
        filesToEmit.set(outputFile.path, outputFile);
    }
    return {
        filesToEmit: Array.from(filesToEmit.values()),
        filesToDelete: [],
    };
}
//# sourceMappingURL=assets.js.map