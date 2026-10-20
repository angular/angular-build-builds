"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuildOutputFileType = void 0;
exports.findTransitiveInitialFiles = findTransitiveInitialFiles;
exports.createOutputFile = createOutputFile;
exports.convertOutputFile = convertOutputFile;
const hash_1 = require("../../utils/hash");
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
function findTransitiveInitialFiles(metafile, initialFiles, entriesToAnalyze = initialFiles, initialFilter) {
    const queue = [...entriesToAnalyze];
    for (let i = 0; i < queue.length; i++) {
        const [entryPath, entryRecord] = queue[i];
        const entryOutput = metafile.outputs[entryPath];
        if (!entryOutput) {
            continue;
        }
        for (const initialImport of entryOutput.imports) {
            if (initialFiles.has(initialImport.path)) {
                continue;
            }
            if (initialImport.kind === 'import-statement' || initialImport.kind === 'import-rule') {
                const record = {
                    type: initialImport.kind === 'import-rule' ? 'style' : 'script',
                    entrypoint: false,
                    external: initialImport.external,
                    serverFile: entryRecord.serverFile,
                    depth: entryRecord.depth + 1,
                };
                if (!initialFilter || initialFilter(record)) {
                    initialFiles.set(initialImport.path, record);
                    if (!initialImport.external) {
                        queue.push([initialImport.path, record]);
                    }
                }
            }
        }
    }
}
var BuildOutputFileType;
(function (BuildOutputFileType) {
    BuildOutputFileType[BuildOutputFileType["Browser"] = 0] = "Browser";
    BuildOutputFileType[BuildOutputFileType["Media"] = 1] = "Media";
    BuildOutputFileType[BuildOutputFileType["ServerApplication"] = 2] = "ServerApplication";
    BuildOutputFileType[BuildOutputFileType["ServerRoot"] = 3] = "ServerRoot";
    BuildOutputFileType[BuildOutputFileType["Root"] = 4] = "Root";
})(BuildOutputFileType || (exports.BuildOutputFileType = BuildOutputFileType = {}));
function createOutputFile(path, data, type) {
    if (typeof data === 'string') {
        let cachedContents = null;
        let cachedText = data;
        let cachedHash = null;
        return {
            path,
            type,
            get contents() {
                cachedContents ??= new TextEncoder().encode(data);
                return cachedContents;
            },
            set contents(value) {
                cachedContents = value;
                cachedText = null;
            },
            get text() {
                cachedText ??= new TextDecoder('utf-8').decode(this.contents);
                return cachedText;
            },
            get size() {
                return this.contents.byteLength;
            },
            get hash() {
                cachedHash ??= (0, hash_1.calculateHash)(cachedText ?? this.contents);
                return cachedHash;
            },
            clone() {
                return createOutputFile(this.path, cachedText ?? this.contents, this.type);
            },
        };
    }
    else {
        let cachedContents = data;
        let cachedText = null;
        let cachedHash = null;
        return {
            get contents() {
                return cachedContents;
            },
            set contents(value) {
                cachedContents = value;
                cachedText = null;
            },
            path,
            type,
            get size() {
                return this.contents.byteLength;
            },
            get text() {
                cachedText ??= new TextDecoder('utf-8').decode(this.contents);
                return cachedText;
            },
            get hash() {
                cachedHash ??= (0, hash_1.calculateHash)(this.contents);
                return cachedHash;
            },
            clone() {
                return createOutputFile(this.path, this.contents, this.type);
            },
        };
    }
}
function convertOutputFile(file, type) {
    let { contents: cachedContents } = file;
    let cachedText = null;
    return {
        get contents() {
            return cachedContents;
        },
        set contents(value) {
            cachedContents = value;
            cachedText = null;
        },
        hash: file.hash,
        path: file.path,
        type,
        get size() {
            return this.contents.byteLength;
        },
        get text() {
            cachedText ??= new TextDecoder('utf-8').decode(this.contents);
            return cachedText;
        },
        clone() {
            return convertOutputFile(this, this.type);
        },
    };
}
//# sourceMappingURL=bundler-files.js.map