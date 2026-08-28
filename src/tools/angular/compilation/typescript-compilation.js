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
exports.TypeScriptCompilation = void 0;
const typescript_1 = __importDefault(require("typescript"));
const path_1 = require("../../../utils/path");
const profiling_1 = require("../../esbuild/profiling");
const angular_compilation_1 = require("./angular-compilation");
const diagnostics_1 = require("./diagnostics");
class TypeScriptCompilation extends angular_compilation_1.AngularCompilation {
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