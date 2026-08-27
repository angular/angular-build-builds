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
exports.I18nInliner = void 0;
const node_assert_1 = __importDefault(require("node:assert"));
const node_path_1 = require("node:path");
const node_v8_1 = require("node:v8");
const hash_1 = require("../../utils/hash");
const worker_pool_1 = require("../../utils/worker-pool");
const bundler_files_1 = require("./bundler-files");
const cache_1 = require("./cache");
const i18n_translation_encoder_1 = require("./i18n-translation-encoder");
/**
 * A keyword used to indicate if a JavaScript file may require inlining of translations.
 * This keyword is used to avoid processing files that would not otherwise need i18n processing.
 */
const LOCALIZE_KEYWORD = '$localize';
/**
 * The maximum number of locales to process concurrently in a single sliding window.
 * This caps peak worker memory while maintaining multi-locale batching throughput.
 */
const DEFAULT_LOCALE_WINDOW_SIZE = 8;
/**
 * Serializes the translation messages for a locale for transfer to an inliner Worker.
 *
 * A SharedArrayBuffer is preferred because it enables zero-copy shared memory access
 * and on-demand string decoding across all worker threads. Falls back to a Blob when
 * SharedArrayBuffer is unavailable.
 *
 * @param translation The translation messages for a locale, if the locale has any.
 * @returns A SharedArrayBuffer or Blob containing the serialized messages, or undefined if none.
 */
function serializeTranslation(translation) {
    if (!translation) {
        return undefined;
    }
    if (typeof SharedArrayBuffer !== 'undefined') {
        return (0, i18n_translation_encoder_1.encodeTranslationToBuffer)(translation);
    }
    return new Blob([(0, node_v8_1.serialize)(translation)]);
}
/**
 * A class that performs i18n translation inlining of JavaScript code.
 * A worker pool is used to distribute the transformation actions and allow
 * parallel processing. Inlining is only performed on code that contains the
 * localize function (`$localize`).
 */
class I18nInliner {
    options;
    #cacheInitFailed = false;
    #workerPool;
    #cacheStore;
    #cache;
    #localizeFiles;
    #unmodifiedFiles;
    constructor(options, maxThreads) {
        this.options = options;
        this.#unmodifiedFiles = [];
        const { outputFiles, missingTranslation } = options;
        const files = new Map();
        const pendingMaps = [];
        for (const file of outputFiles) {
            if (file.type === bundler_files_1.BuildOutputFileType.Root || file.type === bundler_files_1.BuildOutputFileType.ServerRoot) {
                // Skip also the server entry-point.
                // Skip stats and similar files.
                continue;
            }
            const fileExtension = (0, node_path_1.extname)(file.path);
            if (fileExtension === '.js' || fileExtension === '.mjs') {
                // Check if localizations are present
                const contentBuffer = Buffer.isBuffer(file.contents)
                    ? file.contents
                    : Buffer.from(file.contents.buffer, file.contents.byteOffset, file.contents.byteLength);
                const hasLocalize = contentBuffer.includes(LOCALIZE_KEYWORD);
                if (hasLocalize) {
                    files.set(file.path, file);
                    continue;
                }
            }
            else if (fileExtension === '.map') {
                // The related JS file may not have been checked yet. To ensure that map files are not
                // missed, store any pending map files and check them after all output files.
                pendingMaps.push(file);
                continue;
            }
            this.#unmodifiedFiles.push(file);
        }
        // Check if any pending map files should be processed by checking if the parent JS file is present
        for (const file of pendingMaps) {
            if (files.has(file.path.slice(0, -4))) {
                files.set(file.path, file);
            }
            else {
                this.#unmodifiedFiles.push(file);
            }
        }
        this.#localizeFiles = files;
        this.#workerPool = new worker_pool_1.WorkerPool({
            filename: require.resolve('./i18n-inliner-worker'),
            maxThreads,
            // Extract options to ensure only the named options are serialized and sent to the worker
            workerData: {
                missingTranslation,
                // A Blob is an immutable data structure that allows sharing the data between workers
                // without copying until the data is actually used within a Worker. This is useful here
                // since each file may not actually be processed in each Worker and the Blob avoids
                // unneeded repeat copying of potentially large JavaScript files.
                files: new Map(Array.from(files, ([name, file]) => [name, new Blob([file.contents])])),
            },
        });
    }
    /**
     * Performs inlining of translations across multiple locales in parallel.
     *
     * An adaptive 2D task-partitioning algorithm distributes (files x locales) work units
     * across all worker threads while caching AST metadata and sourcemaps in worker memory.
     *
     * @param locales The locales and translations to inline.
     * @returns A map of locale names to their inlined output files and diagnostics.
     */
    async inlineAll(locales) {
        await this.initCache();
        const { missingTranslation, localizeVersion } = this.options;
        const localeList = Array.from(locales);
        if (localeList.length === 0) {
            return new Map();
        }
        const fileResultsByLocale = new Map();
        for (const { locale } of localeList) {
            fileResultsByLocale.set(locale, new Map());
        }
        const filenames = Array.from(this.#localizeFiles.keys()).filter((name) => !name.endsWith('.map'));
        // Process locales in sliding windows to cap peak worker memory
        for (let i = 0; i < localeList.length; i += DEFAULT_LOCALE_WINDOW_SIZE) {
            const windowLocales = localeList.slice(i, i + DEFAULT_LOCALE_WINDOW_SIZE);
            const activeLocales = windowLocales.map((item) => item.locale);
            const isLastWindow = i + DEFAULT_LOCALE_WINDOW_SIZE >= localeList.length;
            // Pre-calculate cache key bases and serialized Blobs for each locale in this window
            const localeCacheBases = new Map();
            const localeBlobs = new Map();
            for (const { locale, translation, translationIntegrity } of windowLocales) {
                localeBlobs.set(locale, serializeTranslation(translation));
                if (this.#cacheStore) {
                    localeCacheBases.set(locale, (0, hash_1.calculateHash)(JSON.stringify({
                        locale,
                        translation: translationIntegrity || translation,
                        missingTranslation,
                        localizeVersion,
                    })));
                }
            }
            const cacheChecks = [];
            for (const filename of filenames) {
                const file = this.#localizeFiles.get(filename);
                (0, node_assert_1.default)(file !== undefined, 'Localize file must exist: ' + filename);
                for (const { locale } of windowLocales) {
                    let cacheKey;
                    let cachedResultPromise = Promise.resolve(null);
                    if (this.#cache) {
                        const fileCacheKeyBase = localeCacheBases.get(locale);
                        (0, node_assert_1.default)(fileCacheKeyBase !== undefined, 'Cache base must exist for locale: ' + locale);
                        const hasher = (0, hash_1.createContentHash)();
                        hasher.update(file.hash);
                        hasher.update(filename);
                        hasher.update(fileCacheKeyBase);
                        cacheKey = hasher.digest();
                        cachedResultPromise = this.#cache
                            .get(cacheKey)
                            .then((val) => val ?? null)
                            .catch(() => null);
                    }
                    cacheChecks.push({
                        filename,
                        locale,
                        cacheKey,
                        cachedResult: cachedResultPromise,
                    });
                }
            }
            // Await all cache checks for this window
            const resolvedChecks = await Promise.all(cacheChecks.map(async (item) => ({
                ...item,
                result: await item.cachedResult,
            })));
            // Group uncached items by filename for this window
            const uncachedByFile = new Map();
            for (const item of resolvedChecks) {
                if (item.result) {
                    // Cache hit: store directly in locale file results
                    fileResultsByLocale.get(item.locale)?.set(item.filename, item.result);
                }
                else {
                    // Cache miss: needs worker processing
                    let fileEntries = uncachedByFile.get(item.filename);
                    if (!fileEntries) {
                        fileEntries = [];
                        uncachedByFile.set(item.filename, fileEntries);
                    }
                    fileEntries.push({
                        locale: item.locale,
                        cacheKey: item.cacheKey,
                        translation: localeBlobs.get(item.locale),
                    });
                }
            }
            // Adaptive 2D Sharding for uncached tasks in this window
            if (uncachedByFile.size > 0) {
                await this.#processUncachedBatches(uncachedByFile, windowLocales.length, fileResultsByLocale, activeLocales, isLastWindow);
            }
        }
        // Assemble final results in deterministic order per locale
        const resultsByLocale = new Map();
        for (const { locale } of localeList) {
            const fileResults = fileResultsByLocale.get(locale);
            const outputFiles = [];
            const errors = [];
            const warnings = [];
            if (fileResults) {
                for (const filename of filenames) {
                    const fileResult = fileResults.get(filename);
                    if (!fileResult) {
                        continue;
                    }
                    const type = this.#localizeFiles.get(filename)?.type;
                    (0, node_assert_1.default)(type !== undefined, 'localized file should always have a type: ' + filename);
                    outputFiles.push((0, bundler_files_1.createOutputFile)(filename, fileResult.code, type));
                    if (fileResult.map) {
                        outputFiles.push((0, bundler_files_1.createOutputFile)(filename + '.map', fileResult.map, type));
                    }
                    for (const message of fileResult.messages) {
                        if (message.type === 'error') {
                            errors.push(message.message);
                        }
                        else {
                            warnings.push(message.message);
                        }
                    }
                }
            }
            // Include cloned unmodified files for every locale
            outputFiles.push(...this.#unmodifiedFiles.map((file) => file.clone()));
            resultsByLocale.set(locale, {
                outputFiles,
                errors,
                warnings,
            });
        }
        return resultsByLocale;
    }
    async #processUncachedBatches(uncachedByFile, localeCount, fileResultsByLocale, activeLocales, isLastWindow = true) {
        const workerCount = this.#workerPool.maxThreads || 1;
        const targetTaskCount = Math.max(uncachedByFile.size, workerCount * 2);
        const localesPerBatch = Math.max(1, Math.ceil(localeCount / (targetTaskCount / (uncachedByFile.size || 1))));
        const workerTasks = [];
        for (const [filename, entries] of uncachedByFile) {
            const ephemeral = isLastWindow && entries.length <= localesPerBatch;
            for (let i = 0; i < entries.length; i += localesPerBatch) {
                const batchEntries = entries.slice(i, i + localesPerBatch);
                const task = (async () => {
                    const batchResult = (await this.#workerPool.run({
                        filename,
                        locales: new Map(batchEntries.map((e) => [e.locale, e.translation])),
                        ephemeral,
                        activeLocales,
                    }, { name: 'inlineFileBatch' }));
                    const cachePromises = [];
                    for (const res of batchResult.results) {
                        const matchingEntry = batchEntries.find((e) => e.locale === res.locale);
                        const cacheKey = matchingEntry?.cacheKey;
                        if (this.#cache && cacheKey) {
                            cachePromises.push(this.#cache.put(cacheKey, {
                                file: filename,
                                code: res.code,
                                map: res.map,
                                messages: res.messages,
                            }));
                        }
                        fileResultsByLocale.get(res.locale)?.set(filename, res);
                    }
                    await Promise.allSettled(cachePromises);
                })();
                workerTasks.push(task);
            }
        }
        await Promise.all(workerTasks);
    }
    /**
     * Performs inlining of translations for the provided locale and translations. The files that
     * are processed originate from the files passed to the class constructor and filter by presence
     * of the localize function keyword.
     * @param locale The string representing the locale to inline.
     * @param translation The translation messages to use when inlining.
     * @param translationIntegrity An optional integrity value for the translation messages to use for caching.
     * @returns A promise that resolves to an array of OutputFiles representing a translated result.
     */
    async inlineForLocale(locale, translation, translationIntegrity) {
        const results = await this.inlineAll([{ locale, translation, translationIntegrity }]);
        const result = results.get(locale);
        (0, node_assert_1.default)(result !== undefined, `Result for locale '${locale}' should be present.`);
        return result;
    }
    async inlineTemplateUpdate(locale, translation, templateCode, templateId) {
        const hasLocalize = templateCode.includes(LOCALIZE_KEYWORD);
        if (!hasLocalize) {
            return {
                code: templateCode,
                errors: [],
                warnings: [],
            };
        }
        const { output, messages } = await this.#workerPool.run({
            code: templateCode,
            filename: templateId,
            locale,
            translation: serializeTranslation(translation),
        }, { name: 'inlineCode' });
        const errors = [];
        const warnings = [];
        for (const message of messages) {
            if (message.type === 'error') {
                errors.push(message.message);
            }
            else {
                warnings.push(message.message);
            }
        }
        return {
            code: output,
            errors,
            warnings,
        };
    }
    /**
     * Stops all active transformation tasks and shuts down all workers.
     * @returns A void promise that resolves when closing is complete.
     */
    async close() {
        await Promise.allSettled([this.#cacheStore?.close(), this.#workerPool.destroy()]);
    }
    /**
     * Initializes the cache for storing translated bundles.
     * If the cache is already initialized, it does nothing.
     *
     * @returns A promise that resolves once the cache initialization process is complete.
     */
    async initCache() {
        if (this.#cacheStore || this.#cacheInitFailed) {
            return;
        }
        const { persistentCachePath } = this.options;
        // Webcontainers currently do not support this persistent cache store.
        if (!persistentCachePath || process.versions.webcontainer) {
            return;
        }
        // Initialize a persistent cache for i18n transformations.
        try {
            const [, cacheStore] = await Promise.all([
                (0, hash_1.initializeHash)(),
                (0, cache_1.createPersistentCacheStore)((0, node_path_1.join)(persistentCachePath, 'angular-i18n')),
            ]);
            this.#cacheStore = cacheStore;
            this.#cache = cacheStore.createCache('transforms');
        }
        catch {
            this.#cacheInitFailed = true;
            // eslint-disable-next-line no-console
            console.warn('Unable to initialize JavaScript cache storage.\n' +
                'This will not affect the build output content but may result in slower builds.');
        }
    }
}
exports.I18nInliner = I18nInliner;
//# sourceMappingURL=i18n-inliner.js.map