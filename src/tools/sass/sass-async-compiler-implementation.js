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
exports.SassAsyncCompilerImplementation = void 0;
const remapping_1 = __importDefault(require("@ampproject/remapping"));
const node_path_1 = require("node:path");
const node_url_1 = require("node:url");
const rebasing_importer_1 = require("./rebasing-importer");
const sass_service_1 = require("./sass-service");
/**
 * A Sass renderer implementation that uses the persistent Dart Sass embedded compiler
 * daemon (`sass-embedded`) communicating over standard input/output with protocol buffers.
 */
class SassAsyncCompilerImplementation {
    #asyncCompiler;
    #asyncCompilerPromise;
    async #ensureAsyncCompiler() {
        if (this.#asyncCompiler) {
            return this.#asyncCompiler;
        }
        // Import and initialize the async compiler on the main thread.
        this.#asyncCompilerPromise ??= Promise.resolve().then(() => __importStar(require('sass-embedded'))).then(({ initAsyncCompiler }) => initAsyncCompiler());
        try {
            this.#asyncCompiler = await this.#asyncCompilerPromise;
        }
        finally {
            this.#asyncCompilerPromise = undefined;
        }
        return this.#asyncCompiler;
    }
    /**
     * Provides information about the Sass implementation.
     * This mimics enough of the `sass-embedded` value to be used with the `sass-loader`.
     */
    get info() {
        return 'sass-embedded\tasync-compiler';
    }
    /**
     * The synchronous render function is not used by the `sass-loader`.
     */
    compileString() {
        throw new Error('Sass compileString is not supported.');
    }
    /**
     * Asynchronously request a Sass stylesheet to be rendered using the native embedded compiler.
     *
     * @param source The contents to compile.
     * @param options The `sass-embedded` options to use when rendering the stylesheet.
     */
    async compileStringAsync(source, options) {
        // The CLI's configuration does not use or expose the ability to define custom Sass functions
        if (options.functions && Object.keys(options.functions).length > 0) {
            throw new Error('Sass custom functions are not supported.');
        }
        const { functions, importers, importer, url, logger, ...serializableOptions } = options;
        let finalImporters;
        let loadPaths = options.loadPaths;
        const entryDirectory = url ? (0, node_path_1.dirname)((0, node_url_1.fileURLToPath)(url)) : process.cwd();
        const directoryCache = new Map();
        const rebaseSourceMaps = options.sourceMap ? new Map() : undefined;
        if (importers?.length) {
            for (const importer of importers) {
                if (!(0, sass_service_1.isFileImporter)(importer)) {
                    throw new Error('Only File Importers are supported.');
                }
            }
            finalImporters = [
                new rebasing_importer_1.AsyncModuleUrlRebasingImporter(entryDirectory, directoryCache, rebaseSourceMaps, async (specifier, options) => {
                    for (const importer of importers) {
                        const result = await importer.findFileUrl(specifier, options);
                        if (result) {
                            return result;
                        }
                    }
                    return null;
                }),
            ];
        }
        if (loadPaths?.length) {
            finalImporters ??= [];
            finalImporters.push(new rebasing_importer_1.LoadPathsUrlRebasingImporter(entryDirectory, directoryCache, rebaseSourceMaps, loadPaths));
            loadPaths = undefined;
        }
        const relativeImporter = new rebasing_importer_1.RelativeUrlRebasingImporter(entryDirectory, directoryCache, rebaseSourceMaps);
        const compiler = await this.#ensureAsyncCompiler();
        const result = await compiler.compileStringAsync(source, {
            ...serializableOptions,
            url,
            loadPaths,
            importers: finalImporters,
            importer: relativeImporter,
            logger,
        });
        if (result.sourceMap && rebaseSourceMaps?.size) {
            result.sourceMap = (0, remapping_1.default)(result.sourceMap, (file, context) => (file !== context.importer ? rebaseSourceMaps.get(file) : null));
        }
        return result;
    }
    /**
     * Shutdown the native embedded Sass compiler daemon.
     * @returns A void promise that resolves when closing is complete.
     */
    async close() {
        if (this.#asyncCompilerPromise) {
            try {
                await this.#ensureAsyncCompiler();
            }
            catch {
                // Ignore compiler initialization failures on shutdown
            }
        }
        if (this.#asyncCompiler) {
            const compiler = this.#asyncCompiler;
            this.#asyncCompiler = undefined;
            await compiler.dispose();
        }
    }
}
exports.SassAsyncCompilerImplementation = SassAsyncCompilerImplementation;
//# sourceMappingURL=sass-async-compiler-implementation.js.map