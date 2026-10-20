/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import type { Metafile, OutputFile } from 'esbuild';
export interface InitialFileRecord {
    entrypoint: boolean;
    name?: string;
    type: 'script' | 'style';
    external?: boolean;
    serverFile: boolean;
    depth: number;
}
/**
 * Analyzes a metafile to find and record all transitive initial files starting from the given
 * initial entries using breadth-first traversal so each file is recorded at its minimum depth.
 *
 * @param metafile The esbuild metafile containing output import relationships.
 * @param initialFiles The map of initial files to populate.
 * @param entriesToAnalyze Optional starting entries to traverse; defaults to all current `initialFiles`.
 *   Entries must share the same starting depth (or be ordered by non-decreasing depth) to guarantee
 *   that each transitive file is visited at its minimum depth first.
 * @param initialFilter Optional filter predicate to determine whether a discovered record should be added.
 */
export declare function findTransitiveInitialFiles(metafile: Metafile, initialFiles: Map<string, InitialFileRecord>, entriesToAnalyze?: Iterable<[string, InitialFileRecord]>, initialFilter?: (initial: Readonly<InitialFileRecord>) => boolean): void;
export declare enum BuildOutputFileType {
    Browser = 0,
    Media = 1,
    ServerApplication = 2,
    ServerRoot = 3,
    Root = 4
}
export interface BuildOutputFile extends OutputFile {
    type: BuildOutputFileType;
    readonly size: number;
    clone: () => BuildOutputFile;
}
export declare function createOutputFile(path: string, data: string | Uint8Array, type: BuildOutputFileType): BuildOutputFile;
export declare function convertOutputFile(file: OutputFile, type: BuildOutputFileType): BuildOutputFile;
