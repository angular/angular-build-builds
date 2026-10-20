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
exports.normalizeAssetPatterns = normalizeAssetPatterns;
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const path_1 = require("./path");
/**
 * Normalizes raw string and object asset patterns into {@link NormalizedAssetsPattern} objects
 * and validates that all asset inputs and outputs stay within the workspace and output directories.
 *
 * @param assetPatterns Raw string or object asset patterns from builder options.
 * @param workspaceRoot Workspace root directory path.
 * @param projectRoot Project root directory path.
 * @param projectSourceRoot Optional project source root directory path.
 * @returns An array of normalized asset pattern configurations.
 */
function normalizeAssetPatterns(assetPatterns, workspaceRoot, projectRoot, projectSourceRoot) {
    if (assetPatterns.length === 0) {
        return [];
    }
    // When sourceRoot is not available, we default to ${projectRoot}/src.
    const sourceRoot = projectSourceRoot || node_path_1.default.join(projectRoot, 'src');
    const resolvedWorkspaceRoot = node_path_1.default.resolve(workspaceRoot);
    const resolvedSourceRoot = node_path_1.default.resolve(resolvedWorkspaceRoot, sourceRoot);
    const resolvedProjectRoot = node_path_1.default.resolve(resolvedWorkspaceRoot, projectRoot);
    return assetPatterns.map((assetPattern) => {
        let normalized;
        // Normalize string asset patterns to objects.
        if (typeof assetPattern === 'string') {
            const assetPath = node_path_1.default.normalize(assetPattern);
            const resolvedAssetPath = node_path_1.default.resolve(resolvedWorkspaceRoot, assetPath);
            let root;
            // Check if the string asset is within sourceRoot.
            if ((0, path_1.isSubDirectory)(resolvedSourceRoot, resolvedAssetPath)) {
                root = resolvedSourceRoot;
            }
            else if ((0, path_1.isSubDirectory)(resolvedProjectRoot, resolvedAssetPath)) {
                root = resolvedProjectRoot;
            }
            else if ((0, path_1.isSubDirectory)(resolvedWorkspaceRoot, resolvedAssetPath)) {
                root = resolvedWorkspaceRoot;
            }
            else {
                throw new Error(`The ${assetPattern} asset path must be within the workspace root.`);
            }
            let isDirectory = true;
            try {
                isDirectory = (0, node_fs_1.statSync)(resolvedAssetPath, { throwIfNoEntry: false })?.isDirectory() ?? true;
            }
            catch { }
            const glob = isDirectory ? '**/*' : node_path_1.default.basename(assetPath);
            const input = isDirectory ? assetPath : node_path_1.default.dirname(assetPath);
            // Output directory for both is the relative path from the root to input.
            const output = node_path_1.default.relative(root, node_path_1.default.resolve(resolvedWorkspaceRoot, input));
            normalized = { glob, input, output };
        }
        else {
            if (!(0, path_1.isSubDirectory)(resolvedWorkspaceRoot, assetPattern.input)) {
                throw new Error(`The ${assetPattern.input} asset path must be within the workspace root.`);
            }
            normalized = {
                ...assetPattern,
                output: node_path_1.default.join('.', assetPattern.output ?? ''),
            };
        }
        if (normalized.output.startsWith('..')) {
            throw new Error('An asset cannot be written to a location outside of the output path.');
        }
        return normalized;
    });
}
//# sourceMappingURL=normalize-asset-patterns.js.map