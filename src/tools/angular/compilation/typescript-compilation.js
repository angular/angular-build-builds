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
exports.TypeScriptCompilation = void 0;
const typescript_1 = __importDefault(require("typescript"));
const path_1 = require("../../../utils/path");
const profiling_1 = require("../../esbuild/profiling");
const angular_compilation_1 = require("./angular-compilation");
const diagnostics_1 = require("./diagnostics");
class TypeScriptCompilation extends angular_compilation_1.AngularCompilation {
    static #angularCompilerCliModule;
    static async loadCompilerCli() {
        TypeScriptCompilation.#angularCompilerCliModule ??= await Promise.resolve().then(() => __importStar(require('@angular/compiler-cli')));
        return TypeScriptCompilation.#angularCompilerCliModule;
    }
    async loadConfiguration(tsconfig) {
        const { readConfiguration } = await TypeScriptCompilation.loadCompilerCli();
        return (0, profiling_1.profileSync)('NG_READ_CONFIG', () => readConfiguration(tsconfig, {
            // Angular specific configuration defaults and overrides to ensure a functioning compilation.
            suppressOutputPathCheck: true,
            outDir: undefined,
            sourceMap: false,
            declaration: false,
            declarationMap: false,
            allowEmptyCodegenFiles: false,
            annotationsAs: 'decorators',
            enableResourceInlining: false,
            supportTestBed: false,
            supportJitMode: false,
            // Disable removing of comments as TS is quite aggressive with these and can
            // remove important annotations, such as /* @__PURE__ */ and comments like /* vite-ignore */.
            removeComments: false,
        }));
    }
    sourceFiles = new Map();
    invalidateFiles(files) {
        for (const file of files) {
            this.sourceFiles.delete((0, path_1.toPosixPath)(file));
        }
    }
    async update(files) {
        this.invalidateFiles(files);
    }
    async diagnoseFiles(modes = angular_compilation_1.DiagnosticModes.All) {
        if (modes === angular_compilation_1.DiagnosticModes.None) {
            return {};
        }
        const result = {};
        await (0, profiling_1.profileAsync)('NG_DIAGNOSTICS_TOTAL', async () => {
            const diagnostics = await this.collectDiagnostics(modes);
            for (const diagnostic of diagnostics) {
                const message = (0, diagnostics_1.convertTypeScriptDiagnostic)(typescript_1.default, diagnostic);
                if (diagnostic.category === typescript_1.default.DiagnosticCategory.Error) {
                    (result.errors ??= []).push(message);
                }
                else {
                    (result.warnings ??= []).push(message);
                }
            }
        });
        return result;
    }
}
exports.TypeScriptCompilation = TypeScriptCompilation;
//# sourceMappingURL=typescript-compilation.js.map