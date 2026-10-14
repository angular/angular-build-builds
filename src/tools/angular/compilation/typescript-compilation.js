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
const profiling_1 = require("../../../utils/profiling");
const angular_compilation_1 = require("./angular-compilation");
const compiler_options_1 = require("./compiler-options");
const diagnostics_1 = require("./diagnostics");
class TypeScriptCompilation extends angular_compilation_1.AngularCompilation {
    static #angularCompilerCliModule;
    #extendedConfigCache = new Map();
    static async loadCompilerCli() {
        TypeScriptCompilation.#angularCompilerCliModule ??= await Promise.resolve().then(() => __importStar(require('@angular/compiler-cli')));
        return TypeScriptCompilation.#angularCompilerCliModule;
    }
    async loadConfiguration(tsconfig, compilerOptionOverrides, buildType = 'application') {
        const { readConfiguration } = await TypeScriptCompilation.loadCompilerCli();
        const { options: originalCompilerOptions, rootNames: originalRootNames, errors, } = (0, profiling_1.profileSync)('NG_READ_CONFIG', () => readConfiguration(tsconfig, {
            // Angular specific configuration defaults and overrides to ensure a functioning compilation.
            suppressOutputPathCheck: true,
            outDir: undefined,
            sourceMap: false,
            ...(buildType === 'library'
                ? { declaration: true }
                : {
                    declaration: false,
                    declarationMap: false,
                }),
            allowEmptyCodegenFiles: false,
            annotationsAs: 'decorators',
            enableResourceInlining: false,
            supportTestBed: false,
            supportJitMode: false,
            // Disable removing of comments as TS is quite aggressive with these and can
            // remove important annotations, such as /* @__PURE__ */ and comments like /* vite-ignore */.
            removeComments: false,
        }, undefined, this.#extendedConfigCache));
        const tsConfigFiles = [(0, path_1.toPosixPath)(tsconfig), ...this.#extendedConfigCache.keys()];
        let rootNames = originalRootNames;
        let fallbackRootNames;
        if (compilerOptionOverrides?.rootFiles?.length) {
            // When explicit rootFiles are provided (e.g., filtered unit test entry points), restrict
            // the initial program to only those entry points so TypeScript resolves only their
            // transitive imports and skips unrelated or non-included test/application files.
            const rootFilesSet = new Set(compilerOptionOverrides.rootFiles.map((file) => (0, path_1.canonicalizePath)((0, path_1.toPosixPath)(file))));
            const fallbackFilesSet = new Set(rootFilesSet);
            for (const file of originalRootNames) {
                const canonicalFile = (0, path_1.canonicalizePath)((0, path_1.toPosixPath)(file));
                // Ambient declaration files (.d.ts) are not imported directly, so they must always be
                // retained from the tsconfig to preserve global type definitions.
                if (/\.d\.[cm]?ts$/i.test(file)) {
                    rootFilesSet.add(canonicalFile);
                }
                fallbackFilesSet.add(canonicalFile);
            }
            rootNames = [...rootFilesSet];
            // For application builds (including unit tests), preserve the full set of tsconfig root
            // files as a fallback in case the AOT compilation encounters a non-standalone component
            // whose declaring NgModule is not directly imported by the entry points. Note that when a
            // test tsconfig uses broad globs (e.g., `src/**/*.ts`), this fallback set will also include
            // non-included spec files; this is an acceptable trade-off to keep compilation agnostic of
            // test-file naming conventions and only occurs for legacy non-standalone components lacking
            // explicit NgModule imports. Library builds are excluded because all public NgModules must
            // be reachable from the library entry points and should never resolve compilation scope from
            // unexported tsconfig files.
            if (buildType === 'application' && fallbackFilesSet.size > rootFilesSet.size) {
                fallbackRootNames = [...fallbackFilesSet];
            }
        }
        const { compilerOptions, warnings } = (0, compiler_options_1.transformCompilerOptions)(typescript_1.default, originalCompilerOptions, compilerOptionOverrides, tsconfig, buildType);
        return {
            compilerOptions,
            rootNames,
            fallbackRootNames,
            errors,
            warnings,
            tsConfigFiles,
        };
    }
    sourceFiles = new Map();
    invalidateFiles(files) {
        for (const file of files) {
            const posixFile = (0, path_1.toPosixPath)(file);
            this.sourceFiles.delete(posixFile);
            if (this.#extendedConfigCache.size === 0) {
                continue;
            }
            if (this.#extendedConfigCache.delete(posixFile)) {
                continue;
            }
            // Check with lowercased key because TypeScript lowercases the keys
            // of the extended config cache on case-insensitive operating systems.
            this.#extendedConfigCache.delete(posixFile.toLowerCase());
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