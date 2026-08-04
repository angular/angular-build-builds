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
const core_1 = require("@babel/core");
const node_module_1 = require("node:module");
const piscina_1 = __importDefault(require("piscina"));
const environment_options_js_1 = require("../../utils/environment-options.js");
const source_map_1 = require("../../utils/source-map");
const textDecoder = new TextDecoder();
const textEncoder = new TextEncoder();
/**
 * The function name prefix for all Angular partial compilation functions.
 * Used to determine if linking of a JavaScript file is required.
 * If any additional declarations are added or otherwise changed in the linker,
 * the names MUST begin with this prefix.
 */
const LINKER_DECLARATION_PREFIX = 'ɵɵngDeclare';
async function transformJavaScript(request) {
    const { filename, data, ...options } = request;
    const textData = typeof data === 'string' ? data : textDecoder.decode(data);
    const transformedData = await transformJavaScriptImpl(filename, textData, options);
    // Transfer the data via `move` instead of cloning
    return piscina_1.default.move(textEncoder.encode(transformedData));
}
/**
 * Cached instance of the OXC linker module.
 */
let oxcLinkerModule;
async function transformJavaScriptImpl(filename, data, options) {
    const shouldLink = !options.skipLinker && requiresLinking(filename, data);
    const useInputSourcemap = options.sourcemap &&
        (!!options.thirdPartySourcemaps || !/[\\/]node_modules[\\/]/.test(filename));
    const babelPlugins = [];
    if (options.instrumentForCoverage) {
        try {
            let resolvedPath = 'istanbul-lib-instrument';
            try {
                const requireFn = (0, node_module_1.createRequire)(filename);
                resolvedPath = requireFn.resolve('istanbul-lib-instrument');
            }
            catch {
                // Fallback to pool worker import traversal
            }
            const istanbul = await Promise.resolve(`${resolvedPath}`).then(s => __importStar(require(s)));
            const programVisitor = istanbul.programVisitor ?? istanbul.default?.programVisitor;
            if (!programVisitor) {
                throw new Error('programVisitor is not available in istanbul-lib-instrument.');
            }
            const { default: coveragePluginFactory } = await Promise.resolve().then(() => __importStar(require('../babel/plugins/add-code-coverage.js')));
            babelPlugins.push(coveragePluginFactory(programVisitor));
        }
        catch (error) {
            throw new Error(`The 'istanbul-lib-instrument' package is required for code coverage but was not found. Please install the package.`, { cause: error });
        }
    }
    let code = data;
    if (shouldLink) {
        if (environment_options_js_1.useBabelLinker) {
            const { createEs2015LinkerPlugin } = await Promise.resolve().then(() => __importStar(require('@angular/compiler-cli/linker/babel')));
            const { ConsoleLogger, LogLevel } = await Promise.resolve().then(() => __importStar(require('@angular/compiler-cli')));
            babelPlugins.push(createEs2015LinkerPlugin({
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
            }));
        }
        else {
            oxcLinkerModule ??= await Promise.resolve().then(() => __importStar(require('../angular/linker/oxc-linker.js')));
            const result = oxcLinkerModule.linkWithOxc(filename, code, {
                sourcemap: useInputSourcemap,
                jit: options.jit,
                skipCheck: true,
            });
            code = result.code;
            if (useInputSourcemap && result.map) {
                code = (0, source_map_1.removeSourceMappingURL)(code);
                const base64Map = Buffer.from(result.map).toString('base64');
                code += `\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,${base64Map}`;
            }
        }
    }
    // If Babel is needed for code coverage or babel linker fallback, run it
    if (babelPlugins.length > 0) {
        const result = await (0, core_1.transformAsync)(code, {
            filename,
            inputSourceMap: (useInputSourcemap ? undefined : false),
            sourceMaps: useInputSourcemap ? 'inline' : false,
            compact: false,
            configFile: false,
            babelrc: false,
            browserslistConfigFile: false,
            plugins: babelPlugins,
        });
        code = result?.code ?? code;
    }
    // Run advanced optimizations using our fast oxc-transform
    if (options.advancedOptimizations) {
        const { transform } = await Promise.resolve().then(() => __importStar(require('../babel/plugins/oxc-transform.js')));
        const sideEffectFree = options.sideEffects === false;
        const safeAngularPackage = sideEffectFree && /[\\/]node_modules[\\/]@angular[\\/]/.test(filename);
        const topLevelSafeMode = !safeAngularPackage;
        const result = transform(filename, code, {
            sourcemap: useInputSourcemap,
            sideEffects: options.sideEffects,
            jit: options.jit,
            topLevelSafeMode,
        });
        code = result.code;
        if (useInputSourcemap && result.map) {
            // Strip old source map comment if Babel added one
            code = (0, source_map_1.removeSourceMappingURL)(code);
            const base64Map = Buffer.from(result.map).toString('base64');
            code += `\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,${base64Map}`;
        }
    }
    // Strip sourcemaps if they should not be used
    return useInputSourcemap ? code : (0, source_map_1.removeSourceMappingURL)(code);
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