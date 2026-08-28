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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AngularCompilation = exports.DiagnosticModes = void 0;
const profiling_1 = require("../../esbuild/profiling");
var DiagnosticModes;
(function (DiagnosticModes) {
    DiagnosticModes[DiagnosticModes["None"] = 0] = "None";
    DiagnosticModes[DiagnosticModes["Option"] = 1] = "Option";
    DiagnosticModes[DiagnosticModes["Syntactic"] = 2] = "Syntactic";
    DiagnosticModes[DiagnosticModes["Semantic"] = 4] = "Semantic";
    DiagnosticModes[DiagnosticModes["All"] = 7] = "All";
})(DiagnosticModes || (exports.DiagnosticModes = DiagnosticModes = {}));
class AngularCompilation {
    static #angularCompilerCliModule;
    static async loadCompilerCli() {
        AngularCompilation.#angularCompilerCliModule ??= await Promise.resolve().then(() => __importStar(require('@angular/compiler-cli')));
        return AngularCompilation.#angularCompilerCliModule;
    }
    async loadConfiguration(tsconfig) {
        const { readConfiguration } = await AngularCompilation.loadCompilerCli();
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
    emitAffectedFiles() {
        return [];
    }
    async diagnoseFiles(modes) {
        return {};
    }
}
exports.AngularCompilation = AngularCompilation;
//# sourceMappingURL=angular-compilation.js.map