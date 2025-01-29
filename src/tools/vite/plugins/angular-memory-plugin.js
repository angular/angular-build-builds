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
exports.createAngularMemoryPlugin = createAngularMemoryPlugin;
const node_assert_1 = __importDefault(require("node:assert"));
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const node_url_1 = require("node:url");
const load_esm_1 = require("../../../utils/load-esm");
const ANGULAR_PREFIX = '/@ng/';
const VITE_FS_PREFIX = '/@fs/';
const FILE_PROTOCOL = 'file:';
async function createAngularMemoryPlugin(options) {
    const { virtualProjectRoot, outputFiles, external } = options;
    const { normalizePath } = await (0, load_esm_1.loadEsmModule)('vite');
    return {
        name: 'vite:angular-memory',
        // Ensures plugin hooks run before built-in Vite hooks
        enforce: 'pre',
        async resolveId(source, importer, { ssr }) {
            if (source.startsWith(VITE_FS_PREFIX)) {
                return;
            }
            // For SSR with component HMR, pass through as a virtual module
            if (ssr && source.startsWith(FILE_PROTOCOL) && source.includes(ANGULAR_PREFIX)) {
                // Vite will resolve these these files example:
                // `file:///@ng/component?c=src%2Fapp%2Fapp.component.ts%40AppComponent&t=1737017253850`
                const sourcePath = (0, node_url_1.fileURLToPath)(source);
                const sourceWithoutRoot = normalizePath('/' + (0, node_path_1.relative)(virtualProjectRoot, sourcePath));
                if (sourceWithoutRoot.startsWith(ANGULAR_PREFIX)) {
                    const [, query] = source.split('?', 2);
                    return `\0${sourceWithoutRoot}?${query}`;
                }
            }
            // Prevent vite from resolving an explicit external dependency (`externalDependencies` option)
            if (external?.includes(source)) {
                // This is still not ideal since Vite will still transform the import specifier to
                // `/@id/${source}` but is currently closer to a raw external than a resolved file path.
                return source;
            }
            if (importer && source[0] === '.') {
                const normalizedImporter = normalizePath(importer);
                if (normalizedImporter.startsWith(virtualProjectRoot)) {
                    // Remove query if present
                    const [importerFile] = normalizedImporter.split('?', 1);
                    source = '/' + (0, node_path_1.join)((0, node_path_1.dirname)((0, node_path_1.relative)(virtualProjectRoot, importerFile)), source);
                }
            }
            const [file] = source.split('?', 1);
            if (outputFiles.has(normalizePath(file))) {
                return (0, node_path_1.join)(virtualProjectRoot, source);
            }
        },
        load(id, loadOptions) {
            // For SSR component updates, return the component update module or empty if none
            if (loadOptions?.ssr && id.startsWith(`\0${ANGULAR_PREFIX}`)) {
                // Extract component identifier (first character is rollup virtual module null)
                const requestUrl = new URL(id.slice(1), 'http://localhost');
                const componentId = requestUrl.searchParams.get('c');
                return (componentId && options.templateUpdates?.get(encodeURIComponent(componentId))) ?? '';
            }
            const [file] = id.split('?', 1);
            const relativeFile = '/' + normalizePath((0, node_path_1.relative)(virtualProjectRoot, file));
            const codeContents = outputFiles.get(relativeFile)?.contents;
            if (codeContents === undefined) {
                if (relativeFile.endsWith('/node_modules/vite/dist/client/client.mjs')) {
                    return options.skipViteClient ? '' : loadViteClientCode(file);
                }
                return undefined;
            }
            const code = Buffer.from(codeContents).toString('utf-8');
            const mapContents = outputFiles.get(relativeFile + '.map')?.contents;
            return {
                // Remove source map URL comments from the code if a sourcemap is present.
                // Vite will inline and add an additional sourcemap URL for the sourcemap.
                code: mapContents ? code.replace(/^\/\/# sourceMappingURL=[^\r\n]*/gm, '') : code,
                map: mapContents && Buffer.from(mapContents).toString('utf-8'),
            };
        },
    };
}
/**
 * Reads the resolved Vite client code from disk and updates the content to remove
 * an unactionable suggestion to update the Vite configuration file to disable the
 * error overlay. The Vite configuration file is not present when used in the Angular
 * CLI.
 * @param file The absolute path to the Vite client code.
 * @returns
 */
async function loadViteClientCode(file) {
    const originalContents = await (0, promises_1.readFile)(file, 'utf-8');
    const updatedContents = originalContents.replace(`"You can also disable this overlay by setting ",
      h("code", { part: "config-option-name" }, "server.hmr.overlay"),
      " to ",
      h("code", { part: "config-option-value" }, "false"),
      " in ",
      h("code", { part: "config-file-name" }, hmrConfigName),
      "."`, '');
    (0, node_assert_1.default)(originalContents !== updatedContents, 'Failed to update Vite client error overlay text.');
    return updatedContents;
}
