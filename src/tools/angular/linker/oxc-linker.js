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
exports.linkWithOxc = linkWithOxc;
const remapping_1 = __importDefault(require("@ampproject/remapping"));
const compiler_cli_1 = require("@angular/compiler-cli");
const linker_1 = require("@angular/compiler-cli/linker");
const magic_string_1 = __importDefault(require("magic-string"));
const oxc_parser_1 = require("oxc-parser");
const source_map_1 = require("../../../utils/source-map");
const oxc_ast_host_1 = require("./oxc-ast-host");
const string_ast_factory_1 = require("./string-ast-factory");
/**
 * A declaration scope that instructs the Angular compiler to emit constant pools
 * inside a local IIFE around each linked declaration rather than hoisting shared
 * constants to the module level.
 *
 * Preferred due to:
 * - In-Place String Replacement: Enables fast in-place string replacements in
 *   `MagicString` without parsing or mutating surrounding ES module statements.
 * - Better Tree-Shaking Locality: Component constants are strictly encapsulated
 *   within the component's `@__PURE__` IIFE closure (`(function() { ... })()`). If a
 *   bundler tree-shakes an unused component from a library FESM, all of its associated
 *   constants are automatically eliminated without leaving orphan top-level variables.
 * - Negligible Wire Size Impact: LZ77/Brotli compression deduplicates repeated IIFE
 *   wrappers and array literals over the wire to near-zero marginal cost.
 */
class InlineDeclarationScope {
    getConstantScopeRef() {
        return null;
    }
}
const noopFileSystem = {
    exists: () => false,
    readFile: () => '',
    resolve: (...paths) => paths.join('/'),
    dirname: (path) => path.split('/').slice(0, -1).join('/'),
    relative: (_from, to) => to,
};
const SHARED_LOGGER = new compiler_cli_1.ConsoleLogger(compiler_cli_1.LogLevel.info);
const SHARED_AST_HOST = new oxc_ast_host_1.OxcAstHost();
const SHARED_DECLARATION_SCOPE = new InlineDeclarationScope();
/**
 * Recursively traverses ESTree AST nodes with subtree pruning.
 * When `onCallExpression` returns `true` for a linked `CallExpression`,
 * child traversal into `callee` and `arguments` is skipped.
 *
 * Why subtree pruning is safe for the linker:
 * - Angular partial declarations (`ɵɵngDeclareComponent`, `ɵɵngDeclareDirective`,
 *   etc.) are never nested inside each other.
 * - Once a declaration `CallExpression` is linked and replaced, there can never be
 *   another partial declaration within its metadata argument object. Pruning its
 *   subtree avoids traversing hundreds of unnecessary metadata argument nodes per
 *   component.
 */
function visitNode(node, onCallExpression) {
    if (node === null || node === undefined || typeof node !== 'object') {
        return;
    }
    if (Array.isArray(node)) {
        for (let i = 0; i < node.length; i++) {
            visitNode(node[i], onCallExpression);
        }
        return;
    }
    const nodeType = node.type;
    if (!nodeType) {
        return;
    }
    if (nodeType === 'CallExpression') {
        if (onCallExpression(node)) {
            // Subtree pruning: partial declarations cannot be nested, so skip child traversal.
            return;
        }
    }
    const keys = oxc_parser_1.visitorKeys[nodeType];
    if (keys) {
        for (let i = 0; i < keys.length; i++) {
            const child = node[keys[i]];
            if (child !== undefined && child !== null) {
                visitNode(child, onCallExpression);
            }
        }
    }
}
/**
 * Executes Angular partial declaration linking on the specified JavaScript file
 * using `oxc-parser` and `magic-string`.
 *
 * @param filename The full path to the file.
 * @param code The source code content.
 * @param options Linker options (sourcemap, jit, skipCheck).
 * @returns An object containing the transformed code and optional source map.
 */
function linkWithOxc(filename, code, options = {}) {
    if (!options.skipCheck && !(0, linker_1.needsLinking)(filename, code)) {
        return { code, map: undefined };
    }
    const astFactory = new string_ast_factory_1.StringAstFactory(code);
    const linkerEnvironment = linker_1.LinkerEnvironment.create(noopFileSystem, SHARED_LOGGER, SHARED_AST_HOST, astFactory, { linkerJitMode: options.jit ?? false });
    const fileLinker = new linker_1.FileLinker(linkerEnvironment, filename, code);
    const { program } = (0, oxc_parser_1.parseSync)(filename, code, { range: true });
    let s;
    let hasLinked = false;
    visitNode(program, (node) => {
        const calleeName = SHARED_AST_HOST.getSymbolName(node.callee);
        if (calleeName && fileLinker.isPartialDeclaration(calleeName)) {
            const args = SHARED_AST_HOST.parseArguments(node);
            const linkedCode = fileLinker.linkPartialDeclaration(calleeName, args, SHARED_DECLARATION_SCOPE);
            s ??= new magic_string_1.default(code);
            s.overwrite(node.start, node.end, linkedCode);
            hasLinked = true;
            return true;
        }
        return false;
    });
    if (!hasLinked || !s) {
        return { code, map: undefined };
    }
    let map;
    if (options.sourcemap) {
        const rawMap = s.generateMap({ hires: true, source: filename });
        const inputMap = (0, source_map_1.loadInputSourceMap)(filename, code);
        if (inputMap) {
            map = (0, remapping_1.default)([rawMap, inputMap], () => null).toString();
        }
        else {
            map = rawMap.toString();
        }
    }
    return {
        code: s.toString(),
        map,
    };
}
//# sourceMappingURL=oxc-linker.js.map