"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProjectSourceRoot = getProjectSourceRoot;
exports.normalizePolyfills = normalizePolyfills;
exports.collectEntrypoints = collectEntrypoints;
exports.hasChunkOrWorkerFiles = hasChunkOrWorkerFiles;
exports.writeTestFiles = writeTestFiles;
exports.first = first;
const fs = __importStar(require("node:fs/promises"));
const node_module_1 = require("node:module");
const node_path_1 = __importDefault(require("node:path"));
const bundler_context_1 = require("../../tools/esbuild/bundler-context");
const utils_1 = require("../../tools/esbuild/utils");
const project_metadata_1 = require("../../utils/project-metadata");
const find_tests_1 = require("./find-tests");
const localResolve = (0, node_module_1.createRequire)(__filename).resolve;
async function getProjectSourceRoot(context) {
    // We have already validated that the project name is set before calling this function.
    const projectName = context.target?.project;
    if (!projectName) {
        return context.workspaceRoot;
    }
    const projectMetadata = await context.getProjectMetadata(projectName);
    const { projectSourceRoot } = (0, project_metadata_1.getProjectRootPaths)(context.workspaceRoot, projectMetadata);
    return projectSourceRoot;
}
function normalizePolyfills(polyfills = []) {
    const jasmineGlobalEntryPoint = localResolve('./polyfills/jasmine_global.js');
    const jasmineGlobalCleanupEntrypoint = localResolve('./polyfills/jasmine_global_cleanup.js');
    const sourcemapEntrypoint = localResolve('./polyfills/init_sourcemaps.js');
    const zoneTestingEntryPoint = 'zone.js/testing';
    const polyfillsExludingZoneTesting = polyfills.filter((p) => p !== zoneTestingEntryPoint);
    return [
        polyfillsExludingZoneTesting.concat([jasmineGlobalEntryPoint, sourcemapEntrypoint]),
        polyfillsExludingZoneTesting.length === polyfills.length
            ? [jasmineGlobalCleanupEntrypoint]
            : [jasmineGlobalCleanupEntrypoint, zoneTestingEntryPoint],
    ];
}
async function collectEntrypoints(options, context, projectSourceRoot) {
    // Glob for files to test.
    const testFiles = await (0, find_tests_1.findTests)(options.include, options.exclude, context.workspaceRoot, projectSourceRoot);
    return (0, find_tests_1.getTestEntrypoints)(testFiles, { projectSourceRoot, workspaceRoot: context.workspaceRoot });
}
function hasChunkOrWorkerFiles(files) {
    return Object.keys(files).some((filename) => {
        return /(?:^|\/)(?:worker|chunk)[^/]+\.js$/.test(filename);
    });
}
async function writeTestFiles(files, testDir) {
    const directoryExists = new Set();
    // Writes the test related output files to disk and ensures the containing directories are present
    await (0, utils_1.emitFilesToDisk)(Object.entries(files), async ([filePath, file]) => {
        if (file.type !== bundler_context_1.BuildOutputFileType.Browser && file.type !== bundler_context_1.BuildOutputFileType.Media) {
            return;
        }
        const fullFilePath = node_path_1.default.join(testDir, filePath);
        // Ensure output subdirectories exist
        const fileBasePath = node_path_1.default.dirname(fullFilePath);
        if (fileBasePath && !directoryExists.has(fileBasePath)) {
            await fs.mkdir(fileBasePath, { recursive: true });
            directoryExists.add(fileBasePath);
        }
        if (file.origin === 'memory') {
            // Write file contents
            await fs.writeFile(fullFilePath, file.contents);
        }
        else {
            // Copy file contents
            await fs.copyFile(file.inputPath, fullFilePath, fs.constants.COPYFILE_FICLONE);
        }
    });
}
/** Returns the first item yielded by the given generator and cancels the execution. */
async function first(generator, { cancel }) {
    if (!cancel) {
        const iterator = generator[Symbol.asyncIterator]();
        const firstValue = await iterator.next();
        if (firstValue.done) {
            throw new Error('Expected generator to emit at least once.');
        }
        return [firstValue.value, iterator];
    }
    for await (const value of generator) {
        return [value, null];
    }
    throw new Error('Expected generator to emit at least once.');
}
