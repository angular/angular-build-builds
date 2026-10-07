/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import type { PackageJsonData } from '../types';
/**
 * The output directory name for ES module format output files.
 */
export declare const FESM_OUTPUT_DIR = "fesm2022";
/**
 * The output directory name for TypeScript declaration files output.
 */
export declare const TYPES_OUTPUT_DIR = "types";
/**
 * Represents an in-memory file to be emitted to disk.
 */
export interface MemoryOutputFile {
    type: 'memory';
    /** The destination path where the file should be written. */
    path: string;
    /** The contents of the file as either a string or byte array. */
    contents: string | Uint8Array;
}
/**
 * Represents an existing file on disk to be copied to a destination path.
 */
export interface DiskOutputFile {
    type: 'disk';
    /** The path to the source file on disk. */
    source: string;
    /** The destination path where the file should be copied. */
    path: string;
}
/**
 * Represents a file to be emitted to disk, either from memory or copied from disk.
 */
export type OutputFile = MemoryOutputFile | DiskOutputFile;
/**
 * Creates an output file descriptor for an existing file on disk.
 *
 * @param source The path to the source file on disk.
 * @param path The destination path where the file should be copied.
 * @returns A {@link DiskOutputFile} descriptor.
 */
export declare function createDiskOutputFile(source: string, path: string): DiskOutputFile;
/**
 * Creates an output file descriptor for an in-memory file.
 *
 * @param path The destination path where the file should be written.
 * @param contents The contents of the file as either a string, byte array, or JSON object.
 * @returns A {@link MemoryOutputFile} descriptor.
 */
export declare function createMemoryOutputFile(path: string, contents: string | Uint8Array | Record<string, unknown>): MemoryOutputFile;
/**
 * Determines whether a file path represents a TypeScript declaration file (`.d.ts`, `.d.mts`, or `.d.cts`).
 *
 * @param path The file path to check.
 * @returns True if the path ends with `.d.ts`, `.d.mts`, or `.d.cts`.
 */
export declare function isDeclarationFile(path: string): boolean;
/**
 * Determines whether a file path represents a declaration source map file (`.d.ts.map`, `.d.mts.map`, or `.d.cts.map`).
 *
 * @param path The file path to check.
 * @returns True if the path ends with `.d.ts.map`, `.d.mts.map`, or `.d.cts.map`.
 */
export declare function isDeclarationSourceMapFile(path: string): boolean;
/**
 * Loads and parses a package.json file from disk.
 *
 * @param packageJsonPath The path to the package.json file.
 * @returns The parsed package.json data.
 */
export declare function loadPackageJson(packageJsonPath: string): Promise<PackageJsonData>;
