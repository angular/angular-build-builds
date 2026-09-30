"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TYPES_OUTPUT_DIR = exports.FESM_OUTPUT_DIR = void 0;
exports.createDiskOutputFile = createDiskOutputFile;
exports.createMemoryOutputFile = createMemoryOutputFile;
exports.isDeclarationFile = isDeclarationFile;
exports.isDeclarationSourceMapFile = isDeclarationSourceMapFile;
const IS_DTS_FILE_REGEXP = /\.d\.[cm]?ts$/i;
const IS_DTS_MAP_FILE_REGEXP = /\.d\.[cm]?ts\.map$/i;
/**
 * The output directory name for ES module format output files.
 */
exports.FESM_OUTPUT_DIR = 'fesm2022';
/**
 * The output directory name for TypeScript declaration files output.
 */
exports.TYPES_OUTPUT_DIR = 'types';
/**
 * Creates an output file descriptor for an existing file on disk.
 *
 * @param source The path to the source file on disk.
 * @param path The destination path where the file should be copied.
 * @returns A {@link DiskOutputFile} descriptor.
 */
function createDiskOutputFile(source, path) {
    return {
        type: 'disk',
        source,
        path,
    };
}
/**
 * Creates an output file descriptor for an in-memory file.
 *
 * @param path The destination path where the file should be written.
 * @param contents The contents of the file as either a string, byte array, or JSON object.
 * @returns A {@link MemoryOutputFile} descriptor.
 */
function createMemoryOutputFile(path, contents) {
    return {
        type: 'memory',
        path,
        contents: typeof contents === 'string' || contents instanceof Uint8Array
            ? contents
            : JSON.stringify(contents, null, 2) + '\n',
    };
}
/**
 * Determines whether a file path represents a TypeScript declaration file (`.d.ts`, `.d.mts`, or `.d.cts`).
 *
 * @param path The file path to check.
 * @returns True if the path ends with `.d.ts`, `.d.mts`, or `.d.cts`.
 */
function isDeclarationFile(path) {
    return IS_DTS_FILE_REGEXP.test(path);
}
/**
 * Determines whether a file path represents a declaration source map file (`.d.ts.map`, `.d.mts.map`, or `.d.cts.map`).
 *
 * @param path The file path to check.
 * @returns True if the path ends with `.d.ts.map`, `.d.mts.map`, or `.d.cts.map`.
 */
function isDeclarationSourceMapFile(path) {
    return IS_DTS_MAP_FILE_REGEXP.test(path);
}
//# sourceMappingURL=utils.js.map