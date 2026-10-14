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
exports.collectAssetsToEmit = collectAssetsToEmit;
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const picomatch_1 = __importDefault(require("picomatch"));
const resolve_assets_1 = require("../../../utils/resolve-assets");
const utils_1 = require("./utils");
/**
 * Resolves and collects configured library assets to be emitted to disk.
 *
 * @param assets The normalized asset patterns with POSIX paths.
 * @param workspaceRoot The normalized POSIX workspace root directory path.
 * @param modifiedFiles Optional set of modified POSIX file paths for incremental copying in watch mode.
 * @returns An array of disk file emission descriptors.
 */
async function collectAssetsToEmit(assets, workspaceRoot, modifiedFiles) {
    if (assets.length === 0 || modifiedFiles?.size === 0) {
        return [];
    }
    if (modifiedFiles) {
        const matchers = createAssetMatchers(assets);
        const filesToEmit = [];
        for (const file of modifiedFiles) {
            for (const { asset, prefix, isMatch } of matchers) {
                if (!file.startsWith(prefix)) {
                    continue;
                }
                const relative = file.slice(prefix.length);
                if (!isMatch(relative)) {
                    continue;
                }
                if ((0, node_fs_1.statSync)(file, { throwIfNoEntry: false })?.isFile()) {
                    filesToEmit.push((0, utils_1.createDiskOutputFile)(file, node_path_1.default.posix.join(asset.output, relative)));
                }
            }
        }
        return filesToEmit;
    }
    const resolvedAssets = await (0, resolve_assets_1.resolveAssets)(assets, workspaceRoot);
    return resolvedAssets.map(({ source, destination }) => (0, utils_1.createDiskOutputFile)(source, destination));
}
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
//# sourceMappingURL=assets.js.map