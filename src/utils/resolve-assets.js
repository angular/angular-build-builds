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
exports.normalizeAssetIgnorePatterns = normalizeAssetIgnorePatterns;
exports.resolveAssets = resolveAssets;
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const tinyglobby_1 = require("tinyglobby");
const concurrency_1 = require("./concurrency");
const path_1 = require("./path");
const DEFAULT_ASSET_IGNORE_FILES = new Set([
    '.gitkeep',
    '.DS_Store',
    'Thumbs.db',
]);
const DEFAULT_ASSET_IGNORE_PATTERNS = Array.from(DEFAULT_ASSET_IGNORE_FILES, (file) => `**/${file}`);
/**
 * Normalizes an ignore glob pattern to match directory-exclusion semantics by stripping
 * trailing slashes, normalizing POSIX segments, and expanding patterns with `/**`
 * (returning both `normalized` and `${normalized}/**` for single-wildcard suffixes
 * because `picomatch` does not make trailing `/**` optional after `*`).
 *
 * @param pattern The raw ignore glob pattern string.
 * @returns The normalized POSIX glob patterns.
 */
function normalizeIgnorePattern(pattern) {
    if (!pattern) {
        return [];
    }
    const posixNormalized = node_path_1.default.posix.normalize(pattern);
    const normalized = posixNormalized.length > 1 && posixNormalized.endsWith('/')
        ? posixNormalized.slice(0, -1)
        : posixNormalized;
    if (!normalized.endsWith('*')) {
        return [`${normalized}/**`];
    }
    if (normalized === '**' || normalized.endsWith('/**')) {
        return [normalized];
    }
    return [normalized, `${normalized}/**`];
}
/**
 * Combines default asset ignore patterns with user-provided ignore patterns and normalizes
 * them so directory patterns (such as `'sub'` or `'sub/'`) exclude all nested files.
 *
 * @param ignore Optional user-provided ignore glob patterns.
 * @returns The normalized ignore glob patterns.
 */
function normalizeAssetIgnorePatterns(ignore) {
    if (!ignore?.length) {
        return [...DEFAULT_ASSET_IGNORE_PATTERNS];
    }
    return [
        ...DEFAULT_ASSET_IGNORE_PATTERNS,
        ...ignore.flatMap((pattern) => normalizeIgnorePattern(pattern)),
    ];
}
async function resolveAssets(entries, root) {
    const resolvedEntries = await (0, concurrency_1.mapConcurrent)(entries, concurrency_1.MAX_CONCURRENT_READS, async (entry) => {
        if (!(0, path_1.isSubDirectory)(root, entry.input)) {
            throw new Error(`The ${entry.input} asset path must be within the workspace root.`);
        }
        if (!entry.glob || entry.glob.endsWith('/')) {
            return [];
        }
        const cwd = node_path_1.default.resolve(root, entry.input);
        if (!entry.ignore?.length && !(0, tinyglobby_1.isDynamicPattern)(entry.glob)) {
            const src = node_path_1.default.join(cwd, entry.glob);
            if ((0, path_1.isSubDirectory)(cwd, src)) {
                if (DEFAULT_ASSET_IGNORE_FILES.has(node_path_1.default.basename(src))) {
                    return [];
                }
                try {
                    const stats = await (entry.followSymlinks ? (0, promises_1.stat)(src) : (0, promises_1.lstat)(src));
                    if (stats.isFile()) {
                        const filePath = entry.flatten ? node_path_1.default.basename(src) : node_path_1.default.relative(cwd, src);
                        return [{ source: src, destination: node_path_1.default.join(entry.output, filePath) }];
                    }
                    return [];
                }
                catch {
                    // File does not exist or cannot be accessed.
                    return [];
                }
            }
        }
        const files = await (0, tinyglobby_1.glob)(entry.glob, {
            cwd,
            dot: true,
            expandDirectories: false,
            ignore: normalizeAssetIgnorePatterns(entry.ignore),
            followSymbolicLinks: entry.followSymlinks ?? false,
        });
        return files.map((file) => {
            const destination = node_path_1.default.join(entry.output, entry.flatten ? node_path_1.default.basename(file) : file);
            if (destination === '..' || destination.startsWith(`..${node_path_1.default.sep}`)) {
                throw new Error('An asset cannot be written to a location outside of the output path.');
            }
            return {
                source: node_path_1.default.join(cwd, file),
                destination,
            };
        });
    });
    return resolvedEntries.flat();
}
//# sourceMappingURL=resolve-assets.js.map