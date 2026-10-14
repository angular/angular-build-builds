"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitFilesToDisk = emitFilesToDisk;
exports.deleteFilesFromDisk = deleteFilesFromDisk;
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const concurrency_1 = require("./concurrency");
/**
 * Maximum number of concurrent file system write/copy operations to avoid open file descriptor exhaustion.
 */
const MAX_CONCURRENT_OPS = 64;
/**
 * Writes or copies a collection of files to disk with bounded concurrency,
 * ensuring parent directories are created once per invocation.
 *
 * @param files The collection of files to emit.
 * @param resolveDestinationPath Callback returning the absolute destination path for a file, or `undefined` to skip it.
 */
async function emitFilesToDisk(files, resolveDestinationPath) {
    if (files.length === 0) {
        return;
    }
    const directoryCreationPromises = new Map();
    await (0, concurrency_1.runConcurrent)(files, MAX_CONCURRENT_OPS, async (file) => {
        const fullFilePath = resolveDestinationPath(file);
        if (!fullFilePath) {
            return;
        }
        // Ensure output subdirectories exist
        const fileBasePath = (0, node_path_1.dirname)(fullFilePath);
        if (fileBasePath) {
            let mkdirPromise = directoryCreationPromises.get(fileBasePath);
            if (!mkdirPromise) {
                mkdirPromise = (0, promises_1.mkdir)(fileBasePath, { recursive: true });
                directoryCreationPromises.set(fileBasePath, mkdirPromise);
            }
            await mkdirPromise;
        }
        if (file.origin === 'memory') {
            // Write file contents
            await (0, promises_1.writeFile)(fullFilePath, file.contents);
            return;
        }
        // Copy file contents
        await (0, promises_1.cp)(file.source, fullFilePath, {
            mode: promises_1.constants.COPYFILE_FICLONE,
            preserveTimestamps: true,
        });
    });
}
/**
 * Deletes a collection of files from disk with bounded concurrency.
 * @param files The collection of files to delete.
 */
async function deleteFilesFromDisk(files) {
    if (files.length === 0) {
        return;
    }
    await (0, concurrency_1.runConcurrent)(files, MAX_CONCURRENT_OPS, (file) => (0, promises_1.rm)(file, { force: true }));
}
//# sourceMappingURL=disk-files.js.map