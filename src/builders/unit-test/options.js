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
exports.normalizeOptions = normalizeOptions;
const architect_1 = require("@angular-devkit/architect");
const node_path_1 = __importDefault(require("node:path"));
const normalize_cache_1 = require("../../utils/normalize-cache");
const project_metadata_1 = require("../../utils/project-metadata");
async function normalizeOptions(context, projectName, options) {
    // Setup base paths based on workspace root and project information
    const workspaceRoot = context.workspaceRoot;
    const projectMetadata = await context.getProjectMetadata(projectName);
    const { projectRoot, projectSourceRoot } = (0, project_metadata_1.getProjectRootPaths)(workspaceRoot, projectMetadata);
    // Gather persistent caching option and provide a project specific cache location
    const cacheOptions = (0, normalize_cache_1.normalizeCacheOptions)(projectMetadata, workspaceRoot);
    cacheOptions.path = node_path_1.default.join(cacheOptions.path, projectName);
    // Target specifier defaults to the current project's build target using a development configuration
    const buildTargetSpecifier = options.buildTarget ?? `::development`;
    const buildTarget = (0, architect_1.targetFromTargetString)(buildTargetSpecifier, projectName, 'build');
    const { codeCoverage, codeCoverageExclude, tsConfig, runner, reporters, browsers, watch } = options;
    return {
        // Project/workspace information
        workspaceRoot,
        projectRoot,
        projectSourceRoot,
        cacheOptions,
        // Target/configuration specified options
        buildTarget,
        include: options.include ?? ['**/*.spec.ts'],
        exclude: options.exclude ?? [],
        runnerName: runner,
        codeCoverage,
        codeCoverageExclude,
        tsConfig,
        reporters,
        browsers,
        watch,
    };
}
/**
 * Normalize a directory path string.
 * Currently only removes a trailing slash if present.
 * @param path A path string.
 * @returns A normalized path string.
 */
function normalizeDirectoryPath(path) {
    const last = path[path.length - 1];
    if (last === '/' || last === '\\') {
        return path.slice(0, -1);
    }
    return path;
}
