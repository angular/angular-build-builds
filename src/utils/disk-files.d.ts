/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
/**
 * Represents a file that can be emitted to disk from memory or copied from an existing path on disk.
 */
export type EmittableFile = {
    origin: 'memory';
    contents: string | Uint8Array;
} | {
    origin: 'disk';
    source: string;
};
/**
 * Writes or copies a collection of files to disk with bounded concurrency,
 * ensuring parent directories are created once per invocation.
 *
 * @param files The collection of files to emit.
 * @param resolveDestinationPath Callback returning the absolute destination path for a file, or `undefined` to skip it.
 */
export declare function emitFilesToDisk<T extends EmittableFile = EmittableFile>(files: readonly T[], resolveDestinationPath: (file: T) => string | undefined): Promise<void>;
/**
 * Deletes a collection of files from disk with bounded concurrency.
 * @param files The collection of files to delete.
 */
export declare function deleteFilesFromDisk(files: readonly string[]): Promise<void>;
