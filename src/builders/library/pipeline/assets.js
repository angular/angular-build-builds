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
 * Compiles picomatch matchers and POSIX input prefixes for each asset configuration.
 *
 * @param assets The normalized asset patterns with POSIX input and output paths.
 * @returns An array of compiled asset matcher descriptors.
 */
function createAssetMatchers(assets) {
    return assets.map((asset) => {
        const isMatch = (0, picomatch_1.default)(asset.glob, {
            dot: true,
            ignore: [...resolve_assets_1.DEFAULT_ASSET_IGNORE, ...(asset.ignore ?? [])],
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
        const filesToEmit = [];
        const filesToDelete = [];
        for (const file of modifiedFiles) {
            let isFile;
            if (emittedAssets.has(file)) {
                isFile = (0, node_fs_1.statSync)(file, { throwIfNoEntry: false })?.isFile() ?? false;
                if (!isFile) {
                    filesToDelete.push(file);
                    continue;
                }
            }
            for (const { asset, prefix, isMatch } of matchers) {
                if (!file.startsWith(prefix)) {
                    continue;
                }
                const relative = file.slice(prefix.length);
                if (!isMatch(relative)) {
                    continue;
                }
                isFile ??= (0, node_fs_1.statSync)(file, { throwIfNoEntry: false })?.isFile() ?? false;
                if (!isFile) {
                    break;
                }
                filesToEmit.push((0, utils_1.createDiskOutputFile)(file, node_path_1.default.posix.join(asset.output, relative)));
            }
        }
        return { filesToEmit, filesToDelete };
    }
    const resolvedAssets = await (0, resolve_assets_1.resolveAssets)(assets, workspaceRoot);
    return {
        filesToEmit: resolvedAssets.map(({ source, destination }) => (0, utils_1.createDiskOutputFile)(source, destination)),
        filesToDelete: [],
    };
}
//# sourceMappingURL=assets.js.map