"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.findTests = findTests;
exports.getTestEntrypoints = getTestEntrypoints;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const tinyglobby_1 = require("tinyglobby");
const path_1 = require("../../utils/path");
/**
 * Finds all test files in the project.
 *
 * @param include Glob patterns of files to include.
 * @param exclude Glob patterns of files to exclude.
 * @param workspaceRoot The absolute path to the workspace root.
 * @param projectSourceRoot The absolute path to the project's source root.
 * @returns A unique set of absolute paths to all test files.
 */
async function findTests(include, exclude, workspaceRoot, projectSourceRoot) {
    const staticMatches = new Set();
    const dynamicPatterns = [];
    const normalizedExcludes = exclude.map((p) => normalizePattern(p, workspaceRoot, projectSourceRoot));
    // 1. Separate static and dynamic patterns
    for (const pattern of include) {
        const normalized = normalizePattern(pattern, workspaceRoot, projectSourceRoot);
        if ((0, tinyglobby_1.isDynamicPattern)(normalized)) {
            dynamicPatterns.push(normalized);
        }
        else {
            const result = await handleStaticPattern(normalized, projectSourceRoot);
            if (Array.isArray(result)) {
                result.forEach((file) => staticMatches.add(file));
            }
            else {
                // It was a static path that didn't resolve to a spec, treat as dynamic
                dynamicPatterns.push(result);
            }
        }
    }
    // 2. Execute a single glob for all dynamic patterns
    if (dynamicPatterns.length > 0) {
        const globMatches = await (0, tinyglobby_1.glob)(dynamicPatterns, {
            cwd: projectSourceRoot,
            absolute: true,
            expandDirectories: false,
            ignore: ['**/node_modules/**', ...normalizedExcludes],
        });
        for (const match of globMatches) {
            staticMatches.add(match);
        }
    }
    // 3. Combine and de-duplicate results
    return [...staticMatches];
}
/**
 * Generates unique, dash-delimited bundle names for a set of test files.
 * This is used to create distinct output files for each test.
 *
 * @param testFiles An array of absolute paths to test files.
 * @param options Configuration options for generating entry points.
 * @returns A map where keys are the generated unique bundle names and values are the original file paths.
 */
function getTestEntrypoints(testFiles, { projectSourceRoot, workspaceRoot, removeTestExtension }) {
    const seen = new Set();
    const roots = [projectSourceRoot, workspaceRoot];
    return new Map(Array.from(testFiles, (testFile) => {
        const fileName = generateNameFromPath(testFile, roots, !!removeTestExtension);
        const baseName = `spec-${fileName}`;
        let uniqueName = baseName;
        let suffix = 2;
        while (seen.has(uniqueName)) {
            uniqueName = `${baseName}-${suffix}`.replace(/([^\w](?:spec|test))-([\d]+)$/, '-$2$1');
            ++suffix;
        }
        seen.add(uniqueName);
        return [uniqueName, testFile];
    }));
}
/**
 * Generates a unique, dash-delimited name from a file path.
 * This is used to create a consistent and readable bundle name for a given test file.
 * @param testFile The absolute path to the test file.
 * @param roots An array of root paths to remove from the beginning of the test file path.
 * @param removeTestExtension Whether to remove the `.spec` or `.test` extension from the result.
 * @returns A dash-cased name derived from the relative path of the test file.
 */
function generateNameFromPath(testFile, roots, removeTestExtension) {
    const relativePath = removeRoots(testFile, roots);
    let startIndex = 0;
    // Skip leading dots and slashes
    while (startIndex < relativePath.length && /^[./\\]$/.test(relativePath[startIndex])) {
        startIndex++;
    }
    let endIndex = relativePath.length;
    if (removeTestExtension) {
        const match = relativePath.match(/\.(spec|test)\.[^.]+$/);
        if (match?.index) {
            endIndex = match.index;
        }
    }
    else {
        const extIndex = relativePath.lastIndexOf('.');
        if (extIndex > startIndex) {
            endIndex = extIndex;
        }
    }
    // Build the final string in a single pass
    let result = '';
    for (let i = startIndex; i < endIndex; i++) {
        const char = relativePath[i];
        result += char === '/' || char === '\\' ? '-' : char;
    }
    return result;
}
const removeLeadingSlash = (pattern) => {
    if (pattern.charAt(0) === '/') {
        return pattern.substring(1);
    }
    return pattern;
};
const removeRelativeRoot = (path, root) => {
    if (path.startsWith(root)) {
        return path.substring(root.length);
    }
    return path;
};
/**
 * Removes potential root paths from a file path, returning a relative path.
 * If no root path matches, it returns the file's basename.
 */
function removeRoots(path, roots) {
    for (const root of roots) {
        if (path.startsWith(root)) {
            return path.substring(root.length);
        }
    }
    return (0, node_path_1.basename)(path);
}
/**
 * Normalizes a glob pattern by converting it to a POSIX path, removing leading slashes,
 * and making it relative to the project source root.
 *
 * @param pattern The glob pattern to normalize.
 * @param workspaceRoot The absolute path to the workspace root.
 * @param projectSourceRoot The absolute path to the project's source root.
 * @returns A normalized glob pattern.
 */
function normalizePattern(pattern, workspaceRoot, projectSourceRoot) {
    // normalize pattern, glob lib only accepts forward slashes
    let normalizedPattern = (0, path_1.toPosixPath)(pattern);
    normalizedPattern = removeLeadingSlash(normalizedPattern);
    const relativeProjectRoot = (0, path_1.toPosixPath)((0, node_path_1.relative)(workspaceRoot, projectSourceRoot) + '/');
    // remove relativeProjectRoot to support relative paths from root
    // such paths are easy to get when running scripts via IDEs
    return removeRelativeRoot(normalizedPattern, relativeProjectRoot);
}
/**
 * Handles static (non-glob) patterns by attempting to resolve them to a directory
 * of spec files or a corresponding `.spec` file.
 *
 * @param pattern The static path pattern.
 * @param projectSourceRoot The absolute path to the project's source root.
 * @returns A promise that resolves to either an array of found spec files, a new glob pattern,
 * or the original pattern if no special handling was applied.
 */
async function handleStaticPattern(pattern, projectSourceRoot) {
    const fullPath = (0, node_path_1.join)(projectSourceRoot, pattern);
    if (await isDirectory(fullPath)) {
        return `${pattern}/**/*.spec.@(ts|tsx)`;
    }
    const fileExt = (0, node_path_1.extname)(pattern);
    // Replace extension to `.spec.ext`. Example: `src/app/app.component.ts`-> `src/app/app.component.spec.ts`
    const potentialSpec = (0, node_path_1.join)(projectSourceRoot, (0, node_path_1.dirname)(pattern), `${(0, node_path_1.basename)(pattern, fileExt)}.spec${fileExt}`);
    if (await exists(potentialSpec)) {
        return [potentialSpec];
    }
    return pattern;
}
/** Checks if a path exists and is a directory. */
async function isDirectory(path) {
    try {
        const stats = await node_fs_1.promises.stat(path);
        return stats.isDirectory();
    }
    catch {
        return false;
    }
}
/** Checks if a path exists on the file system. */
async function exists(path) {
    try {
        await node_fs_1.promises.access(path, node_fs_1.constants.F_OK);
        return true;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=test-discovery.js.map