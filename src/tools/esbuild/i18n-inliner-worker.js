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
exports.inlineFileBatch = inlineFileBatch;
exports.inlineCode = inlineCode;
const remapping_1 = __importDefault(require("@ampproject/remapping"));
const magic_string_1 = require("magic-string");
const node_assert_1 = __importDefault(require("node:assert"));
const node_v8_1 = require("node:v8");
const node_worker_threads_1 = require("node:worker_threads");
const oxc_parser_1 = require("oxc-parser");
const i18n_locale_plugin_1 = require("./i18n-locale-plugin");
const i18n_translation_reader_1 = require("./i18n-translation-reader");
// Extract the application files and common options used for inline requests from the Worker context
const { files, missingTranslation } = (node_worker_threads_1.workerData || {});
/**
 * Cache of file data promises keyed by filename.
 */
const fileDataCache = new Map();
/**
 * Cache of deserialized translation messages keyed by locale.
 */
const deserializedTranslations = new Map();
/**
 * Retrieves the file data for a filename, loading and extracting localization metadata.
 * If `cache` is true, the result is cached in `fileDataCache` across requests in this Worker.
 * If `cache` is false (ephemeral), the result is not retained in `fileDataCache`, allowing it
 * to be garbage-collected once the batch request finishes.
 *
 * @param filename The name of the file to load.
 * @param cache Whether to cache the loaded file data in the Worker's long-term cache.
 * @returns The cached or newly extracted code and localization metadata.
 */
function loadFileData(filename, cache = true) {
    const existing = fileDataCache.get(filename);
    if (existing) {
        return existing;
    }
    const fileDataPromise = (async () => {
        const data = files.get(filename);
        (0, node_assert_1.default)(data !== undefined, `Invalid inline request for file '${filename}'.`);
        const code = await data.text();
        const metadata = extractLocalizeMetadata(filename, code);
        return { code, metadata };
    })();
    if (cache) {
        fileDataPromise.catch(() => {
            fileDataCache.delete(filename);
        });
        fileDataCache.set(filename, fileDataPromise);
    }
    return fileDataPromise;
}
/**
 * Deserializes or wraps the translation messages for a locale, reusing the result for any
 * subsequent request that targets the same locale.
 * @param locale The locale identifier.
 * @param translation Optional serialized translation messages (SharedArrayBuffer or Blob).
 * @returns The translation messages, or undefined if the locale has no translations.
 */
function loadTranslation(locale, translation) {
    if (!translation) {
        return undefined;
    }
    let messagesPromise = deserializedTranslations.get(locale);
    if (!messagesPromise) {
        if (translation instanceof Blob) {
            messagesPromise = translation
                .arrayBuffer()
                .then((buffer) => (0, node_v8_1.deserialize)(new Uint8Array(buffer)))
                .catch((error) => {
                deserializedTranslations.delete(locale);
                throw error;
            });
        }
        else {
            messagesPromise = Promise.resolve((0, i18n_translation_reader_1.createSharedTranslationProxy)(translation));
        }
        deserializedTranslations.set(locale, messagesPromise);
    }
    return messagesPromise;
}
/**
 * Inlines multiple locales and translations into a JavaScript file that contains `$localize` usage.
 *
 * @param request An InlineFileBatchRequest object representing the options for inlining.
 * @returns An object containing the inlined results for each requested locale.
 */
async function inlineFileBatch(request) {
    if (request.activeLocales) {
        const activeSet = new Set(request.activeLocales);
        for (const locale of deserializedTranslations.keys()) {
            if (!activeSet.has(locale)) {
                deserializedTranslations.delete(locale);
            }
        }
    }
    const { code, metadata } = await loadFileData(request.filename, !request.ephemeral);
    // Fast path: file has no $localize call sites or locale insert sites
    if (metadata.callSites.length === 0 && metadata.localeInsertSites.length === 0) {
        return {
            file: request.filename,
            unmodified: true,
            messages: (metadata.diagnostics ?? []).map((message) => ({
                type: 'error',
                message,
            })),
        };
    }
    // Parse the sourcemap once for the entire batch.
    // It will naturally be garbage-collected after this batch action returns.
    const rawMap = await files.get(request.filename + '.map')?.text();
    const map = rawMap ? JSON.parse(rawMap) : undefined;
    const results = await Promise.all(Array.from(request.locales, async ([locale, translation]) => {
        const result = await inlineLocalize(code, map, metadata, locale, await loadTranslation(locale, translation), request.filename);
        return {
            locale,
            code: result.code,
            map: result.map,
            messages: result.diagnostics.messages,
        };
    }));
    return {
        file: request.filename,
        results,
    };
}
/**
 * Inlines the provided locale and translation into JavaScript code that contains `$localize` usage.
 * This function is a secondary entry primarily for use with component HMR update modules.
 *
 * @param request An InlineRequest object representing the options for inlining
 * @returns An object containing the inlined code.
 */
async function inlineCode(request) {
    const metadata = extractLocalizeMetadata(request.filename, request.code);
    const result = await inlineLocalize(request.code, undefined, metadata, request.locale, await loadTranslation(request.locale, request.translation), request.filename);
    return {
        output: result.code ?? request.code,
        messages: result.diagnostics.messages,
    };
}
/**
 * Cached instance of the `@angular/localize/tools` module.
 * This is used to remove the need to repeatedly import the module per file translation.
 */
let localizeToolsModule;
/**
 * Attempts to load the `@angular/localize/tools` module containing the functionality to
 * perform the file translations.
 * This module must be dynamically loaded as it is an ESM module and this file is CommonJS.
 */
async function loadLocalizeTools() {
    // Load ESM `@angular/localize/tools` using the TypeScript dynamic import workaround.
    // Once TypeScript provides support for keeping the dynamic import this workaround can be
    // changed to a direct dynamic import.
    localizeToolsModule ??= await Promise.resolve().then(() => __importStar(require('@angular/localize/tools')));
    return localizeToolsModule;
}
/**
 * Traverses ESTree AST nodes in post-order (bottom-up) without recursion.
 * Bottom-up traversal ensures that nested `$localize` expressions are transformed and
 * written to MagicString before outer containing templates are evaluated.
 *
 * @param root The root AST node to traverse.
 * @param onExit Callback invoked on each AST node in post-order.
 */
function walkAstPostOrder(root, onExit) {
    const traverseStack = [root];
    const postOrderNodes = [];
    while (traverseStack.length > 0) {
        const current = traverseStack.pop();
        if (!current) {
            continue;
        }
        postOrderNodes.push(current);
        const keys = oxc_parser_1.visitorKeys[current.type];
        if (!keys) {
            continue;
        }
        for (let i = 0; i < keys.length; i++) {
            const child = current[keys[i]];
            if (!child) {
                continue;
            }
            if (Array.isArray(child)) {
                for (const item of child) {
                    if (item) {
                        traverseStack.push(item);
                    }
                }
            }
            else {
                traverseStack.push(child);
            }
        }
    }
    // Process collected nodes in reverse order to achieve bottom-up (post-order) traversal
    for (let i = postOrderNodes.length - 1; i >= 0; i--) {
        onExit(postOrderNodes[i]);
    }
}
/**
 * Extracts localization call sites and locale insertion points from JavaScript code using OXC.
 *
 * @param filename The name of the file being processed.
 * @param code The JavaScript source code.
 * @returns The extracted localization metadata.
 */
function extractLocalizeMetadata(filename, code) {
    const { program } = (0, oxc_parser_1.parseSync)(filename, code, {
        sourceType: 'unambiguous',
    });
    if (!program) {
        throw new Error(`Unknown error occurred parsing file "${filename}" with OXC.`);
    }
    const callSites = [];
    const localeInsertSites = [];
    let diagnostics;
    walkAstPostOrder(program, (node) => {
        if (node.type === 'Literal') {
            if (typeof node.value === 'string' && node.value === '___NG_LOCALE_INSERT___') {
                localeInsertSites.push({ start: node.start, end: node.end });
            }
        }
        else if (node.type === 'TaggedTemplateExpression') {
            if (node.tag.type === 'Identifier' && node.tag.name === '$localize') {
                const cooked = [];
                const raw = [];
                let hasMalformedEscape = false;
                for (const q of node.quasi.quasis) {
                    if (q.value.cooked === null || q.value.cooked === undefined) {
                        hasMalformedEscape = true;
                        (diagnostics ??= []).push(`Malformed escape sequence in $localize template literal in file "${filename}".`);
                        break;
                    }
                    cooked.push(q.value.cooked);
                    raw.push(q.value.raw);
                }
                if (!hasMalformedEscape) {
                    const messageParts = Object.assign(cooked, { raw });
                    const expressions = node.quasi.expressions.map((expr) => ({
                        start: expr.start,
                        end: expr.end,
                    }));
                    callSites.push({
                        start: node.start,
                        end: node.end,
                        messageParts,
                        expressions,
                    });
                }
            }
        }
    });
    return { callSites, localeInsertSites, diagnostics };
}
/**
 * Inlines translations into code using previously extracted localization metadata.
 *
 * @param code The source code to transform.
 * @param map Optional source map for the source code.
 * @param metadata Extracted localization metadata.
 * @param locale The target locale identifier.
 * @param translation The translation messages dictionary, or undefined for untranslated locale.
 * @param filename The name of the file being transformed.
 * @returns The transformed code, optional remapped source map, and diagnostics.
 */
async function inlineLocalize(code, map, metadata, locale, translation, filename) {
    const magicString = new magic_string_1.MagicString(code);
    const { Diagnostics, translate } = await loadLocalizeTools();
    const diagnostics = new Diagnostics();
    if (metadata.diagnostics) {
        for (const message of metadata.diagnostics) {
            diagnostics.error(message);
        }
    }
    if (metadata.localeInsertSites.length > 0) {
        const localeData = await (0, i18n_locale_plugin_1.loadLocaleData)(locale);
        if (localeData.error) {
            diagnostics.error(localeData.error);
        }
        else if (localeData.warning) {
            diagnostics.warn(localeData.warning);
        }
        let injected = false;
        for (const site of metadata.localeInsertSites) {
            magicString.overwrite(site.start, site.end, JSON.stringify(locale) + (localeData.code && !injected ? `;\n${localeData.code}\n;` : ''));
            injected = true;
        }
    }
    for (const callSite of metadata.callSites) {
        const [translatedParts, translatedSubstitutions] = translate(diagnostics, translation || {}, callSite.messageParts, callSite.expressions.map((_, index) => index), translation === undefined ? 'ignore' : missingTranslation);
        // Reconstruct the new template/string literal replacement
        let replacement;
        if (translatedSubstitutions.length === 0) {
            replacement = JSON.stringify(translatedParts[0]);
        }
        else {
            replacement = '`';
            for (let i = 0; i < translatedParts.length; i++) {
                const escapedPart = JSON.stringify(translatedParts[i])
                    .slice(1, -1)
                    .replace(/\\"/g, '"')
                    .replace(/`/g, '\\`')
                    .replace(/\$\{/g, '\\${');
                replacement += escapedPart;
                if (i < translatedSubstitutions.length) {
                    const originalIndex = translatedSubstitutions[i];
                    const expr = callSite.expressions[originalIndex];
                    const exprCode = magicString.slice(expr.start, expr.end);
                    replacement += '${' + exprCode + '}';
                }
            }
            replacement += '`';
        }
        magicString.overwrite(callSite.start, callSite.end, replacement);
    }
    if (!magicString.hasChanged()) {
        return {
            code: undefined,
            map: undefined,
            diagnostics,
        };
    }
    const outputCode = magicString.toString();
    let outputMap;
    if (map) {
        // A decoded map is generated here rather than an encoded one because remapping decodes its
        // inputs. Encoding the mappings only for remapping to immediately decode them again doubles
        // the peak memory of the largest structure involved in inlining a file.
        const rawMap = magicString.generateDecodedMap({
            source: filename,
            includeContent: true,
            hires: 'boundary',
        });
        outputMap = (0, remapping_1.default)([{ ...rawMap, version: 3 }, map], () => null);
    }
    return {
        code: outputCode,
        map: outputMap && JSON.stringify(outputMap),
        diagnostics,
    };
}
//# sourceMappingURL=i18n-inliner-worker.js.map