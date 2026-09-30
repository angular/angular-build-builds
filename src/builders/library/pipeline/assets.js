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
exports.checkAssetChanges = checkAssetChanges;
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const picomatch_1 = __importDefault(require("picomatch"));
const path_1 = require("../../../utils/path");
const resolve_assets_1 = require("../../../utils/resolve-assets");
const utils_1 = require("./utils");
/**
 * Resolves and collects configured library assets to be emitted to disk,
 * and registers their source paths with the watch set.
 *
 * @param assets The normalized asset patterns.
 * @param workspaceRoot The workspace root directory path.
 * @param allWatchedFiles Set collecting all watched file paths for watch mode.
 * @param modifiedFiles Optional set of modified file paths for incremental copying in watch mode.
 * @returns An array of disk file emission descriptors.
 */
async function collectAssetsToEmit(assets, workspaceRoot, allWatchedFiles, modifiedFiles) {
    if (assets.length === 0) {
        return [];
    }
    if (modifiedFiles) {
        if (modifiedFiles.size === 0) {
            return [];
        }
        const matchers = createAssetMatchers(assets, workspaceRoot);
        const filesToEmit = [];
        for (const file of modifiedFiles) {
            const resolvedFile = node_path_1.default.isAbsolute(file) ? file : node_path_1.default.resolve(workspaceRoot, file);
            const posixFile = (0, path_1.toPosixPath)(resolvedFile);
            for (const { asset, posixInputPrefix, isMatch } of matchers) {
                if (!posixFile.startsWith(posixInputPrefix)) {
                    continue;
                }
                const relative = posixFile.slice(posixInputPrefix.length);
                if (!isMatch(relative)) {
                    continue;
                }
                if ((0, node_fs_1.statSync)(resolvedFile, { throwIfNoEntry: false })?.isFile()) {
                    filesToEmit.push((0, utils_1.createDiskOutputFile)(resolvedFile, node_path_1.default.join(asset.output, relative)));
                    allWatchedFiles.add(posixFile);
                }
            }
        }
        return filesToEmit;
    }
    const resolvedAssets = await (0, resolve_assets_1.resolveAssets)(assets, workspaceRoot);
    const filesToEmit = [];
    for (const { source, destination } of resolvedAssets) {
        filesToEmit.push((0, utils_1.createDiskOutputFile)(source, destination));
        allWatchedFiles.add((0, path_1.toPosixPath)(source));
    }
    return filesToEmit;
}
/**
 * Checks whether any configured library assets were modified.
 *
 * @param assets The normalized asset patterns.
 * @param workspaceRoot The workspace root directory path.
 * @param changedFiles Set of changed file paths.
 * @returns True if any asset file was modified.
 */
function checkAssetChanges(assets, workspaceRoot, changedFiles) {
    if (assets.length === 0 || changedFiles.size === 0) {
        return false;
    }
    const matchers = createAssetMatchers(assets, workspaceRoot);
    for (const file of changedFiles) {
        const resolvedFile = node_path_1.default.isAbsolute(file) ? file : node_path_1.default.resolve(workspaceRoot, file);
        const posixFile = (0, path_1.toPosixPath)(resolvedFile);
        for (const { posixInputPrefix, isMatch } of matchers) {
            if (posixFile.startsWith(posixInputPrefix)) {
                const relative = posixFile.slice(posixInputPrefix.length);
                if (isMatch(relative)) {
                    return true;
                }
            }
        }
    }
    return false;
}
function createAssetMatchers(assets, workspaceRoot) {
    return assets.map((asset) => {
        const absInput = node_path_1.default.resolve(workspaceRoot, asset.input);
        const posixInput = (0, path_1.toPosixPath)(absInput).replace(/\/+$/, '');
        const isMatch = (0, picomatch_1.default)(asset.glob, {
            dot: true,
            ignore: [...resolve_assets_1.DEFAULT_ASSET_IGNORE, ...(asset.ignore ?? [])],
        });
        return { asset, posixInputPrefix: `${posixInput}/`, isMatch };
    });
}
//# sourceMappingURL=assets.js.map