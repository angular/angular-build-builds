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
exports.writeTestFiles = writeTestFiles;
const node_path_1 = __importDefault(require("node:path"));
const bundler_files_1 = require("../tools/esbuild/bundler-files");
const disk_files_1 = require("./disk-files");
/**
 * Writes a collection of build result files to a specified directory.
 * This function handles both in-memory and on-disk files, creating subdirectories
 * as needed.
 *
 * @param files A collection of `ResultFile` objects, representing the build output.
 * @param testDir The absolute path to the directory where the files should be written.
 */
function writeTestFiles(files, testDir) {
    // Writes the test related output files to disk and ensures the containing directories are present
    return (0, disk_files_1.emitFilesToDisk)(files, (file) => file.type === bundler_files_1.BuildOutputFileType.Browser || file.type === bundler_files_1.BuildOutputFileType.Media
        ? node_path_1.default.join(testDir, file.path)
        : undefined);
}
//# sourceMappingURL=test-files.js.map