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
exports.default = transformJavaScript;
const remapping_1 = __importDefault(require("@ampproject/remapping"));
const core_1 = require("@babel/core");
const node_module_1 = require("node:module");
const piscina_1 = __importDefault(require("piscina"));
const environment_options_js_1 = require("../../utils/environment-options.js");
const source_map_1 = require("../../utils/source-map");
const textDecoder = new TextDecoder();
const textEncoder = new TextEncoder();
const SOURCEMAP_COMMENT_BYTES = Buffer.from('//# sourceMappingURL=');
/**
 * The function name prefix for all Angular partial compilation functions.
 * Used to determine if linking of a JavaScript file is required.
 * If any additional declarations are added or otherwise changed in the linker,
 * the names MUST begin with this prefix.
 */
const LINKER_DECLARATION_PREFIX = 'ɵɵngDeclare';
async function instrumentCoverage(filename, data, useInputSourcemap) {
    try {
        let resolvedPath = 'istanbul-lib-instrument';
        try {
            const requireFn = (0, node_module_1.createRequire)(filename);
            resolvedPath = requireFn.resolve('istanbul-lib-instrument');
        }
        catch {
            // Fallback to pool worker import traversal
        }
        const { createInstrumenter } = (await Promise.resolve(`${resolvedPath}`).then(s => __importStar(require(s))));
        const instrumenter = createInstrumenter({
            produceSourceMap: useInputSourcemap,
            esModules: true,
        });
        const inputSourceMap = useInputSourcemap ? (0, source_map_1.loadInputSourceMap)(filename, data) : undefined;
        const instrumentedCode = instrumenter.instrumentSync(data, filename, inputSourceMap);
        const lastMap = useInputSourcemap
            ? instrumenter.lastSourceMap()
            : undefined;
        return {
            code: instrumentedCode,
            map: lastMap ?? undefined,
        };
    }
    catch (error) {
        throw new Error(`The 'istanbul-lib-instrument' package is required for code coverage but was not found. Please install the package.`, { cause: error });
    }
}
async function transformJavaScript(request) {
    const { filename, data, ...options } = request;
    const useInputSourcemap = options.sourcemap &&
        (!!options.thirdPartySourcemaps || !/[\\/]node_modules[\\/]/.test(filename));
    let textData;
    let inputSourceMap;
    let isAlreadyStripped = false;
    if (typeof data !== 'string') {
        const dataBuffer = Buffer.isBuffer(data)
            ? data
            : Buffer.from(data.buffer, data.byteOffset, data.byteLength);
        const firstIndex = dataBuffer.indexOf(SOURCEMAP_COMMENT_BYTES);
        if (firstIndex === -1) {
            // 0 comments: fast path, no sourcemap to load or strip
            textData = textDecoder.decode(data);
            isAlreadyStripped = true;
        }
        else {
            const lastIndex = dataBuffer.lastIndexOf(SOURCEMAP_COMMENT_BYTES);
            // Skip any preceding horizontal whitespace (spaces/tabs) to find the start of the line.
            let prevIdx = lastIndex - 1;
            while (prevIdx >= 0 && (dataBuffer[prevIdx] === 32 || dataBuffer[prevIdx] === 9)) {
                prevIdx--;
            }
            // Ensure the comment starts at the beginning of a line or the start of the file,
            // preventing false positives for occurrences inside inline string literals or code.
            const isLineStart = prevIdx < 0 || dataBuffer[prevIdx] === 10 || dataBuffer[prevIdx] === 13;
            if (firstIndex === lastIndex && isLineStart) {
                const urlLine = dataBuffer
                    .subarray(lastIndex + SOURCEMAP_COMMENT_BYTES.length)
                    .toString('utf-8');
                if (useInputSourcemap) {
                    inputSourceMap = (0, source_map_1.loadInputSourceMapFromUrl)(filename, urlLine);
                    if (inputSourceMap !== undefined) {
                        // Valid trailing sourcemap comment confirmed: safe to slice code buffer for transformation passes.
                        // Note: If no passes modify the code, the untouched original `data` buffer is returned below.
                        textData = textDecoder.decode(dataBuffer.subarray(0, prevIdx < 0 ? 0 : prevIdx + 1));
                        isAlreadyStripped = true;
                    }
                    else {
                        // Not a valid trailing sourcemap (e.g. inside template literal): fallback to full decode
                        textData = textDecoder.decode(data);
                    }
                }
                else if ((0, source_map_1.isTrailingSourceMapComment)(urlLine)) {
                    // Valid trailing sourcemap comment confirmed: safe to slice code buffer
                    textData = textDecoder.decode(dataBuffer.subarray(0, prevIdx < 0 ? 0 : prevIdx + 1));
                    isAlreadyStripped = true;
                }
                else {
                    // Fallback to full decode and state-machine stripping
                    textData = textDecoder.decode(data);
                }
            }
            else {
                // Multiple comments or comment not at line start: fall back to full decode and string parser
                textData = textDecoder.decode(data);
            }
        }
    }
    else {
        textData = data;
    }
    const transformedData = await transformJavaScriptImpl(filename, textData, {
        ...options,
        inputSourceMap,
        isAlreadyStripped,
    });
    // If no transformations modified the code, return the original untouched data buffer via `move`.
    // This preserves any original trailing sourcemap comment and avoids re-encoding.
    if (transformedData === textData && typeof data !== 'string') {
        return piscina_1.default.move(data);
    }
    return piscina_1.default.move(textEncoder.encode(transformedData));
}
/**
 * Cached instance of the OXC linker module.
 */
let oxcLinkerModule;
/**
 * Cached instance of the OXC transform module.
 */
let oxcTransformModule;
async function transformJavaScriptImpl(filename, data, options) {
    const shouldLink = !options.skipLinker && requiresLinking(filename, data);
    const useInputSourcemap = options.sourcemap &&
        (!!options.thirdPartySourcemaps || !/[\\/]node_modules[\\/]/.test(filename));
    let code = data;
    const maps = [];
    let coverageMap;
    if (options.instrumentForCoverage) {
        const result = await instrumentCoverage(filename, code, useInputSourcemap);
        code = result.code;
        coverageMap = result.map;
    }
    if (shouldLink) {
        if (environment_options_js_1.useBabelLinker) {
            const { createEs2015LinkerPlugin } = await Promise.resolve().then(() => __importStar(require('@angular/compiler-cli/linker/babel')));
            const { ConsoleLogger, LogLevel } = await Promise.resolve().then(() => __importStar(require('@angular/compiler-cli')));
            const result = await (0, core_1.transformAsync)(code, {
                filename,
                inputSourceMap: false,
                sourceMaps: !!useInputSourcemap,
                compact: false,
                configFile: false,
                babelrc: false,
                browserslistConfigFile: false,
                plugins: [
                    createEs2015LinkerPlugin({
                        fileSystem: {
                            exists: () => false,
                            readFile: () => '',
                            resolve: (...paths) => paths.join('/'),
                            dirname: (path) => path.split('/').slice(0, -1).join('/'),
                            relative: (_from, to) => to,
                        },
                        logger: new ConsoleLogger(LogLevel.info),
                        linkerJitMode: options.jit,
                        // This is a workaround until https://github.com/angular/angular/issues/42769 is fixed.
                        sourceMapping: false,
                    }),
                ],
            });
            code = result?.code ?? code;
            if (result?.map) {
                maps.push(result.map);
            }
        }
        else {
            oxcLinkerModule ??= await Promise.resolve().then(() => __importStar(require('../angular/linker/oxc-linker.js')));
            const result = oxcLinkerModule.linkWithOxc(filename, code, {
                sourcemap: useInputSourcemap,
                jit: options.jit,
                skipCheck: true,
            });
            code = result.code;
            if (result.map) {
                maps.push(result.map);
            }
        }
    }
    // Run advanced optimizations using our fast oxc-transform
    if (options.advancedOptimizations) {
        oxcTransformModule ??= await Promise.resolve().then(() => __importStar(require('../oxc/oxc-transform.js')));
        const sideEffectFree = options.sideEffects === false;
        const safeAngularPackage = sideEffectFree && /[\\/]node_modules[\\/]@angular[\\/]/.test(filename);
        const topLevelSafeMode = !safeAngularPackage;
        const result = oxcTransformModule.transform(filename, code, {
            sourcemap: useInputSourcemap,
            sideEffects: options.sideEffects,
            topLevelSafeMode,
        });
        code = result.code;
        if (result.map) {
            maps.push(result.map);
        }
    }
    if (useInputSourcemap) {
        const baseMap = coverageMap ?? options.inputSourceMap ?? (0, source_map_1.loadInputSourceMap)(filename, data);
        if (maps.length > 0 || coverageMap) {
            if (!options.isAlreadyStripped) {
                code = (0, source_map_1.removeSourceMappingURL)(code);
            }
            const remappingChain = maps.reverse();
            if (baseMap) {
                remappingChain.push(baseMap);
            }
            if (remappingChain.length > 0) {
                const finalMap = (0, remapping_1.default)(remappingChain, () => null).toString();
                const base64Map = Buffer.from(finalMap).toString('base64');
                code += `\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,${base64Map}`;
            }
        }
        return code;
    }
    // Strip sourcemaps if they should not be used
    return options.isAlreadyStripped ? code : (0, source_map_1.removeSourceMappingURL)(code);
}
function requiresLinking(path, source) {
    // @angular/core and @angular/compiler will cause false positives
    // Also, TypeScript files do not require linking
    if (/[\\/]@angular[\\/](?:compiler|core)|\.tsx?$/.test(path)) {
        return false;
    }
    // Check if the source code includes one of the declaration functions.
    // There is a low chance of a false positive but the names are fairly unique
    // and the result would be an unnecessary no-op additional plugin pass.
    return source.includes(LINKER_DECLARATION_PREFIX);
}
//# sourceMappingURL=javascript-transformer-worker.js.map