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
exports.createWasmPlugin = createWasmPlugin;
const node_assert_1 = __importDefault(require("node:assert"));
const node_crypto_1 = require("node:crypto");
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const error_1 = require("../../utils/error");
const load_result_cache_1 = require("./load-result-cache");
const WASM_INIT_NAMESPACE = 'angular:wasm:init';
const WASM_CONTENTS_NAMESPACE = 'angular:wasm:contents';
const WASM_RESOLVE_SYMBOL = Symbol('WASM_RESOLVE_SYMBOL');
// See: https://github.com/tc39/proposal-regexp-unicode-property-escapes/blob/fe6d07fad74cd0192d154966baa1e95e7cda78a1/README.md#other-examples
const ecmaIdentifierNameRegExp = /^(?:[$_\p{ID_Start}])(?:[$_\u200C\u200D\p{ID_Continue}])*$/u;
/**
 * Creates an esbuild plugin to use WASM files with import statements and expressions.
 * The default behavior follows the WebAssembly/ES mode integration proposal found at
 * https://github.com/WebAssembly/esm-integration/tree/main/proposals/esm-integration.
 * This behavior requires top-level await support which is only available in zoneless
 * Angular applications.
 * @returns An esbuild plugin.
 */
function createWasmPlugin(options) {
    const { allowAsync = false, cache } = options;
    return {
        name: 'angular-wasm',
        setup(build) {
            build.onResolve({ filter: /.wasm$/ }, async (args) => {
                // Skip if already resolving the WASM file to avoid infinite resolution
                if (args.pluginData?.[WASM_RESOLVE_SYMBOL]) {
                    return;
                }
                // Skip if not an import statement or expression
                if (args.kind !== 'import-statement' && args.kind !== 'dynamic-import') {
                    return;
                }
                // When in the initialization namespace, the content has already been resolved
                // and only needs to be loaded for use with the initialization code.
                if (args.namespace === WASM_INIT_NAMESPACE) {
                    return {
                        namespace: WASM_CONTENTS_NAMESPACE,
                        path: (0, node_path_1.join)(args.resolveDir, args.path),
                        pluginData: args.pluginData,
                    };
                }
                // Skip if a custom loader is defined
                if (build.initialOptions.loader?.['.wasm'] || args.with['loader']) {
                    return;
                }
                // Attempt full resolution of the WASM file
                const resolveOptions = {
                    ...args,
                    pluginData: { [WASM_RESOLVE_SYMBOL]: true },
                };
                // The "path" property will cause an error if used in the resolve call
                delete resolveOptions.path;
                const result = await build.resolve(args.path, resolveOptions);
                // Skip if there are errors, is external, or another plugin resolves to a custom namespace
                if (result.errors.length > 0 || result.external || result.namespace !== 'file') {
                    // Reuse already resolved result
                    return result;
                }
                return {
                    ...result,
                    namespace: WASM_INIT_NAMESPACE,
                };
            });
            build.onLoad({ filter: /.wasm$/, namespace: WASM_INIT_NAMESPACE }, (0, load_result_cache_1.createCachedLoad)(cache, async (args) => {
                // Ensure async mode is supported
                if (!allowAsync) {
                    return {
                        errors: [
                            {
                                text: 'WASM/ES module integration imports are not supported with Zone.js applications',
                                notes: [
                                    {
                                        text: 'Information about zoneless Angular applications can be found here: https://angular.dev/guide/experimental/zoneless',
                                    },
                                ],
                            },
                        ],
                    };
                }
                const wasmContents = await (0, promises_1.readFile)(args.path);
                // Inline WASM code less than 10kB
                const inlineWasm = wasmContents.byteLength < 10_000;
                // Add import of WASM contents
                let initContents = `import ${inlineWasm ? 'wasmData' : 'wasmPath'} from ${JSON.stringify((0, node_path_1.basename)(args.path))}`;
                initContents += inlineWasm ? ' with { loader: "binary" };' : ';\n\n';
                // Read from the file system when on Node.js (SSR) and not inline
                if (!inlineWasm && build.initialOptions.platform === 'node') {
                    initContents += 'import { readFile } from "node:fs/promises";\n';
                    initContents += 'const wasmData = await readFile(wasmPath);\n';
                }
                // Create initialization function
                initContents += generateInitHelper(!inlineWasm && build.initialOptions.platform !== 'node', wasmContents);
                // Analyze WASM for imports and exports
                let importModuleNames, exportNames;
                try {
                    const wasm = await WebAssembly.compile(wasmContents);
                    importModuleNames = new Set(WebAssembly.Module.imports(wasm).map((value) => value.module));
                    exportNames = WebAssembly.Module.exports(wasm).map((value) => value.name);
                }
                catch (error) {
                    (0, error_1.assertIsError)(error);
                    return {
                        errors: [{ text: 'Unable to analyze WASM file', notes: [{ text: error.message }] }],
                    };
                }
                // Ensure export names are valid JavaScript identifiers
                const invalidExportNames = exportNames.filter((name) => !ecmaIdentifierNameRegExp.test(name));
                if (invalidExportNames.length > 0) {
                    return {
                        errors: invalidExportNames.map((name) => ({
                            text: 'WASM export names must be valid JavaScript identifiers',
                            notes: [
                                {
                                    text: `The export "${name}" is not valid. The WASM file should be updated to remove this error.`,
                                },
                            ],
                        })),
                    };
                }
                // Add import statements and setup import object
                initContents += 'const importObject = Object.create(null);\n';
                let importIndex = 0;
                for (const moduleName of importModuleNames) {
                    // Add a namespace import for each module name
                    initContents += `import * as wasm_import_${++importIndex} from ${JSON.stringify(moduleName)};\n`;
                    // Add the namespace object to the import object
                    initContents += `importObject[${JSON.stringify(moduleName)}] = wasm_import_${importIndex};\n`;
                }
                // Instantiate the module
                initContents += 'const instance = await init(importObject);\n';
                // Add exports
                const exportNameList = exportNames.join(', ');
                initContents += `const { ${exportNameList} } = instance.exports;\n`;
                initContents += `export { ${exportNameList} }\n`;
                return {
                    contents: initContents,
                    loader: 'js',
                    resolveDir: (0, node_path_1.dirname)(args.path),
                    pluginData: { wasmContents },
                    watchFiles: [args.path],
                };
            }));
            build.onLoad({ filter: /.wasm$/, namespace: WASM_CONTENTS_NAMESPACE }, async (args) => {
                const contents = args.pluginData.wasmContents ?? (await (0, promises_1.readFile)(args.path));
                let loader = 'file';
                if (args.with.loader) {
                    (0, node_assert_1.default)(args.with.loader === 'binary' || args.with.loader === 'file', 'WASM loader type should only be binary or file.');
                    loader = args.with.loader;
                }
                return {
                    contents,
                    loader,
                    watchFiles: [args.path],
                };
            });
        },
    };
}
/**
 * Generates the string content of the WASM initialization helper function.
 * This function supports both file fetching and inline byte data depending on
 * the preferred option for the WASM file. When fetching, an integrity hash is
 * also generated and used with the fetch action.
 *
 * @param streaming Uses fetch and WebAssembly.instantiateStreaming.
 * @param wasmContents The binary contents to generate an integrity hash.
 * @returns A string containing the initialization function.
 */
function generateInitHelper(streaming, wasmContents) {
    let resultContents;
    if (streaming) {
        const fetchOptions = {
            integrity: 'sha256-' + (0, node_crypto_1.createHash)('sha-256').update(wasmContents).digest('base64'),
        };
        const fetchContents = `fetch(new URL(wasmPath, import.meta.url), ${JSON.stringify(fetchOptions)})`;
        resultContents = `await WebAssembly.instantiateStreaming(${fetchContents}, imports)`;
    }
    else {
        resultContents = 'await WebAssembly.instantiate(wasmData, imports)';
    }
    const contents = `
let mod;
async function init(imports) {
  if (mod) {
    return await WebAssembly.instantiate(mod, imports);
  }

  const result = ${resultContents};
  mod = result.module;

  return result.instance;
}
`;
    return contents;
}
