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
exports.ChangedFiles = void 0;
exports.toPosixPathNormalized = toPosixPathNormalized;
exports.getDirectoryPath = getDirectoryPath;
exports.createWatcher = createWatcher;
exports.isPathInside = isPathInside;
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const picomatch_1 = __importDefault(require("picomatch"));
const path_1 = require("../../utils/path");
class ChangedFiles {
    added = new Set();
    modified = new Set();
    removed = new Set();
    get all() {
        return Array.from(new Set([...this.added, ...this.modified, ...this.removed]));
    }
    toDebugString() {
        const content = {
            added: Array.from(this.added),
            modified: Array.from(this.modified),
            removed: Array.from(this.removed),
        };
        return JSON.stringify(content, null, 2);
    }
}
exports.ChangedFiles = ChangedFiles;
/**
 * Probes the filesystem at the specified target directory to determine whether it is case-sensitive.
 */
function isFileSystemCaseSensitive(targetDir = process.cwd()) {
    try {
        const resolved = path.resolve(targetDir);
        if (!fs.existsSync(resolved)) {
            return process.platform !== 'win32' && process.platform !== 'darwin';
        }
        // Invert the casing of the target directory path.
        const altCase = resolved === resolved.toLowerCase() ? resolved.toUpperCase() : resolved.toLowerCase();
        // If the path contains no alphabetic characters (e.g. root '/'), invert-casing
        // produces the exact same string. Fall back to platform-specific defaults in this case.
        if (resolved === altCase) {
            return process.platform !== 'win32' && process.platform !== 'darwin';
        }
        // If both the original path and the inverted-casing path exist on disk,
        // the filesystem is case-insensitive (returns false).
        return !fs.existsSync(altCase);
    }
    catch {
        // If an error occurs (e.g., permission denied), default to the platform-specific
        // behavior (case-insensitive on Windows/macOS, sensitive on Linux/Unix).
        return process.platform !== 'win32' && process.platform !== 'darwin';
    }
}
/**
 * Normalizes a file system path string to POSIX format (forward slashes '/')
 * and strips trailing slashes (except root '/' or Windows drive root 'C:/').
 */
function toPosixPathNormalized(pathString) {
    let posixPath = (0, path_1.toPosixPath)(pathString);
    if (posixPath.length > 1 && posixPath.endsWith('/') && !/^[a-zA-Z]:\/$/.test(posixPath)) {
        posixPath = posixPath.slice(0, -1);
    }
    return posixPath;
}
/**
 * Returns a lookup key for set lookups and matching, lowercasing on case-insensitive file systems.
 */
function toLookupKey(posixPath, isCaseSensitive) {
    return isCaseSensitive ? posixPath : posixPath.toLowerCase();
}
/**
 * Returns the parent directory of a normalized POSIX path, correctly handling Windows drive roots.
 */
function getDirectoryPath(posixPath) {
    const lastSlash = posixPath.lastIndexOf('/');
    if (lastSlash === -1) {
        return '.';
    }
    const dir = posixPath.slice(0, lastSlash);
    if (dir === '' || dir.endsWith(':')) {
        return dir + '/';
    }
    return dir;
}
/**
 * Determines whether a file path lookup key or any of its parent directories are present in watchedFiles.
 */
function isPathWatched(fileLookupKey, watchedFiles) {
    if (watchedFiles.has(fileLookupKey)) {
        return true;
    }
    let current = fileLookupKey;
    while (true) {
        const parent = getDirectoryPath(current);
        if (parent === current) {
            break;
        }
        if (watchedFiles.has(parent)) {
            return true;
        }
        current = parent;
    }
    return false;
}
class WatcherQueue {
    nextQueue = [];
    currentChangedFiles;
    isClosed = false;
    timeoutId;
    addChange(type, file) {
        if (this.isClosed) {
            return;
        }
        const changedFiles = (this.currentChangedFiles ??= new ChangedFiles());
        changedFiles[type].add(file);
        this.scheduleFlush();
    }
    addChanges(changes) {
        if (this.isClosed || changes.length === 0) {
            return;
        }
        const changedFiles = (this.currentChangedFiles ??= new ChangedFiles());
        for (const { type, file } of changes) {
            changedFiles[type].add(file);
        }
        this.scheduleFlush();
    }
    scheduleFlush() {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }
        this.timeoutId = setTimeout(() => {
            this.timeoutId = undefined;
            this.flush();
        }, 250);
    }
    flush() {
        if (this.currentChangedFiles &&
            this.currentChangedFiles.all.length > 0 &&
            this.nextQueue.length > 0) {
            const next = this.nextQueue.shift();
            if (next) {
                const result = this.currentChangedFiles;
                this.currentChangedFiles = undefined;
                next(result);
            }
        }
    }
    async next() {
        if (this.currentChangedFiles &&
            this.currentChangedFiles.all.length > 0 &&
            this.nextQueue.length === 0 &&
            !this.timeoutId) {
            const result = { value: this.currentChangedFiles };
            this.currentChangedFiles = undefined;
            return result;
        }
        if (this.isClosed) {
            return { done: true, value: undefined };
        }
        return new Promise((resolve) => {
            this.nextQueue.push((value) => resolve(value ? { value } : { done: true, value: undefined }));
        });
    }
    close() {
        if (this.isClosed) {
            return;
        }
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = undefined;
        }
        this.isClosed = true;
        this.currentChangedFiles = undefined;
        let next;
        while ((next = this.nextQueue.shift()) !== undefined) {
            next();
        }
    }
}
async function createWatcher(options) {
    if (options?.polling) {
        return createChokidarWatcher(options);
    }
    try {
        const parcelWatcher = await Promise.resolve().then(() => __importStar(require('@parcel/watcher')));
        return await createParcelWatcher(options, parcelWatcher);
    }
    catch {
        return createChokidarWatcher(options);
    }
}
/**
 * Checks whether a file path is located inside a parent directory.
 *
 * Input Expectations:
 * - Both `file` and `dir` must be normalized POSIX-style paths (using forward slashes '/').
 * - Both paths must share the same casing normalization (e.g., lowercased on case-insensitive file systems).
 */
function isPathInside(file, dir) {
    if (file === dir) {
        return false;
    }
    const dirWithSlash = dir.endsWith('/') ? dir : dir + '/';
    return file.startsWith(dirWithSlash);
}
class ParcelExternalManager {
    parcelWatcher;
    options;
    rootDirLookupKey;
    handleEvents;
    extraSubscriptions = new Map();
    pendingSubscriptions = new Map();
    externalDirFiles = new Map();
    constructor(parcelWatcher, options, rootDirLookupKey, handleEvents) {
        this.parcelWatcher = parcelWatcher;
        this.options = options;
        this.rootDirLookupKey = rootDirLookupKey;
        this.handleEvents = handleEvents;
    }
    async ensureWatched(posixPath, lookupKey) {
        if (isPathInside(lookupKey, this.rootDirLookupKey) || lookupKey === this.rootDirLookupKey) {
            return;
        }
        const dirPath = getDirectoryPath(posixPath);
        const dirKey = getDirectoryPath(lookupKey);
        let dirEntry = this.externalDirFiles.get(dirKey);
        if (!dirEntry) {
            dirEntry = { dirPath, files: new Set() };
            this.externalDirFiles.set(dirKey, dirEntry);
        }
        dirEntry.files.add(lookupKey);
        await this.ensureDirWatched(dirPath, dirKey);
    }
    removeFile(lookupKey) {
        if (isPathInside(lookupKey, this.rootDirLookupKey) || lookupKey === this.rootDirLookupKey) {
            return;
        }
        const dirKey = getDirectoryPath(lookupKey);
        const dirEntry = this.externalDirFiles.get(dirKey);
        if (dirEntry) {
            dirEntry.files.delete(lookupKey);
            if (dirEntry.files.size === 0) {
                this.externalDirFiles.delete(dirKey);
                const sub = this.extraSubscriptions.get(dirKey);
                if (sub) {
                    this.extraSubscriptions.delete(dirKey);
                    sub.unsubscribe().catch(() => { });
                    for (const [remainingDirKey, remainingDirEntry] of this.externalDirFiles.entries()) {
                        if (!this.isCoveredByExistingExternal(remainingDirKey)) {
                            this.ensureDirWatched(remainingDirEntry.dirPath, remainingDirKey).catch(() => { });
                        }
                    }
                }
            }
        }
    }
    async close() {
        try {
            if (this.pendingSubscriptions.size > 0) {
                await Promise.allSettled(Array.from(this.pendingSubscriptions.values()));
            }
            if (this.extraSubscriptions.size > 0) {
                await Promise.allSettled(Array.from(this.extraSubscriptions.values()).map((sub) => sub.unsubscribe()));
            }
        }
        finally {
            this.extraSubscriptions.clear();
            this.pendingSubscriptions.clear();
            this.externalDirFiles.clear();
        }
    }
    isCoveredByExistingExternal(dirLookupKey) {
        for (const existingDir of this.extraSubscriptions.keys()) {
            if (dirLookupKey === existingDir || isPathInside(dirLookupKey, existingDir)) {
                return true;
            }
        }
        for (const pendingDir of this.pendingSubscriptions.keys()) {
            if (dirLookupKey === pendingDir || isPathInside(dirLookupKey, pendingDir)) {
                return true;
            }
        }
        return false;
    }
    async ensureDirWatched(dirPath, dirKey) {
        if (this.isCoveredByExistingExternal(dirKey)) {
            return;
        }
        const subPromise = this.parcelWatcher.subscribe(dirPath, (err, events) => {
            if (!err) {
                this.handleEvents(events);
            }
        }, {
            ignore: this.options?.ignored,
        });
        this.pendingSubscriptions.set(dirKey, subPromise);
        try {
            const sub = await subPromise;
            if (this.externalDirFiles.has(dirKey) && !this.isCoveredByExistingExternal(dirKey)) {
                this.extraSubscriptions.set(dirKey, sub);
                // Subsume any nested child subscriptions that are now covered by this parent subscription
                for (const [childDir, childSub] of this.extraSubscriptions.entries()) {
                    if (childDir !== dirKey && isPathInside(childDir, dirKey)) {
                        this.extraSubscriptions.delete(childDir);
                        childSub.unsubscribe().catch(() => { });
                    }
                }
            }
            else {
                sub.unsubscribe().catch(() => { });
            }
        }
        catch {
            // Ignore subscription errors for missing or restricted external directories
        }
        finally {
            this.pendingSubscriptions.delete(dirKey);
        }
    }
}
async function createParcelWatcher(options, parcelWatcher) {
    const watchedFiles = new Set();
    const queue = new WatcherQueue();
    const isCaseSensitive = isFileSystemCaseSensitive(options?.cwd);
    const rootDirPosix = toPosixPathNormalized(options?.cwd ?? process.cwd());
    const rootDirLookupKey = toLookupKey(rootDirPosix, isCaseSensitive);
    const initTime = Date.now();
    const handleEvents = (events) => {
        const changes = [];
        for (const event of events) {
            const posixPath = toPosixPathNormalized(event.path);
            const lookupKey = toLookupKey(posixPath, isCaseSensitive);
            if (!isPathWatched(lookupKey, watchedFiles)) {
                continue;
            }
            if (event.type !== 'delete') {
                const stat = fs.statSync(event.path, { throwIfNoEntry: false });
                // Ignore historical events from before watcher initialization, but allow a 1000 ms window
                // to account for coarse filesystem timestamp resolution (e.g., ext4/overlayfs integer second
                // mtime truncation on Linux) where files modified during startup may have truncated .000 ms mtimes.
                if (stat && stat.mtimeMs < initTime - 1000) {
                    continue;
                }
            }
            const type = event.type === 'create' ? 'added' : event.type === 'delete' ? 'removed' : 'modified';
            changes.push({ type, file: event.path });
        }
        if (changes.length > 0) {
            queue.addChanges(changes);
        }
    };
    const subscription = await parcelWatcher.subscribe(rootDirPosix, (err, events) => {
        if (!err) {
            handleEvents(events);
        }
    }, {
        ignore: options?.ignored,
    });
    const externalManager = new ParcelExternalManager(parcelWatcher, options, rootDirLookupKey, handleEvents);
    const buildWatcher = {
        [Symbol.asyncIterator]() {
            return this;
        },
        next() {
            return queue.next();
        },
        add(paths) {
            const targets = typeof paths === 'string' ? [paths] : paths;
            for (const file of targets) {
                const posixPath = toPosixPathNormalized(file);
                const lookupKey = toLookupKey(posixPath, isCaseSensitive);
                if (!watchedFiles.has(lookupKey)) {
                    watchedFiles.add(lookupKey);
                    void externalManager.ensureWatched(posixPath, lookupKey);
                }
            }
        },
        remove(paths) {
            const targets = typeof paths === 'string' ? [paths] : paths;
            for (const file of targets) {
                const posixPath = toPosixPathNormalized(file);
                const lookupKey = toLookupKey(posixPath, isCaseSensitive);
                if (watchedFiles.delete(lookupKey)) {
                    externalManager.removeFile(lookupKey);
                }
            }
        },
        async close() {
            try {
                if (subscription) {
                    await subscription.unsubscribe();
                }
                await externalManager.close();
            }
            finally {
                queue.close();
            }
        },
    };
    return buildWatcher;
}
async function createChokidarWatcher(options, chokidarModule) {
    const chokidar = chokidarModule ?? (await Promise.resolve().then(() => __importStar(require('chokidar'))));
    const watchedFiles = new Set();
    const queue = new WatcherQueue();
    const rootDir = options?.cwd ?? process.cwd();
    const isCaseSensitive = isFileSystemCaseSensitive(rootDir);
    const rootDirPosix = toPosixPathNormalized(rootDir);
    const rootDirLookupKey = toLookupKey(rootDirPosix, isCaseSensitive);
    const ignored = options?.ignored?.map((pattern) => {
        if (/[*?[\]{}()]/.test(pattern)) {
            const isMatch = (0, picomatch_1.default)(pattern, { dot: true });
            return (filePath) => isMatch(toPosixPathNormalized(filePath));
        }
        return { path: toPosixPathNormalized(pattern), recursive: true };
    });
    const watcher = chokidar.watch(rootDir, {
        ignoreInitial: true,
        ignored,
        followSymlinks: options?.followSymlinks,
        usePolling: !!options?.polling,
        interval: options?.interval,
    });
    const initTime = Date.now();
    const handleEvent = (type, rawPath) => {
        const posixPath = toPosixPathNormalized(rawPath);
        const lookupKey = toLookupKey(posixPath, isCaseSensitive);
        if (!isPathWatched(lookupKey, watchedFiles)) {
            return;
        }
        if (type !== 'removed') {
            const stat = fs.statSync(rawPath, { throwIfNoEntry: false });
            // Ignore historical events from before watcher initialization, but allow a 1000 ms window
            // to account for coarse filesystem timestamp resolution (e.g., ext4/overlayfs integer second
            // mtime truncation on Linux) where files modified during startup may have truncated .000 ms mtimes.
            if (stat && stat.mtimeMs < initTime - 1000) {
                return;
            }
        }
        queue.addChange(type, rawPath);
    };
    watcher.on('add', (path) => handleEvent('added', path));
    watcher.on('change', (path) => handleEvent('modified', path));
    watcher.on('unlink', (path) => handleEvent('removed', path));
    const buildWatcher = {
        [Symbol.asyncIterator]() {
            return this;
        },
        next() {
            return queue.next();
        },
        add(paths) {
            const targets = typeof paths === 'string' ? [paths] : paths;
            const newPaths = [];
            for (const p of targets) {
                const posixPath = toPosixPathNormalized(p);
                const lookupKey = toLookupKey(posixPath, isCaseSensitive);
                if (!watchedFiles.has(lookupKey)) {
                    watchedFiles.add(lookupKey);
                    if (!isPathInside(lookupKey, rootDirLookupKey) && lookupKey !== rootDirLookupKey) {
                        newPaths.push(posixPath);
                    }
                }
            }
            if (newPaths.length > 0) {
                watcher.add(newPaths);
            }
        },
        remove(paths) {
            const targets = typeof paths === 'string' ? [paths] : paths;
            const removePaths = [];
            for (const p of targets) {
                const posixPath = toPosixPathNormalized(p);
                const lookupKey = toLookupKey(posixPath, isCaseSensitive);
                if (watchedFiles.has(lookupKey)) {
                    watchedFiles.delete(lookupKey);
                    if (!isPathInside(lookupKey, rootDirLookupKey) && lookupKey !== rootDirLookupKey) {
                        removePaths.push(posixPath);
                    }
                }
            }
            if (removePaths.length > 0) {
                watcher.unwatch(removePaths);
            }
        },
        async close() {
            try {
                await watcher.close();
            }
            finally {
                queue.close();
            }
        },
    };
    return buildWatcher;
}
//# sourceMappingURL=watcher.js.map