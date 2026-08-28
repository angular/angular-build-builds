/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import type * as ng from '@angular/compiler-cli';
import ts from 'typescript';
import { AngularHostOptions } from '../angular-host';
import { AngularCompilationResult, DiagnosticModes, EmitFileResult } from './angular-compilation';
import { TypeScriptCompilation } from './typescript-compilation';
export declare class JitCompilation extends TypeScriptCompilation {
    #private;
    private readonly browserOnlyBuild;
    constructor(browserOnlyBuild: boolean);
    initialize(tsconfig: string, hostOptions: AngularHostOptions, compilerOptionsTransformer?: (compilerOptions: ng.CompilerOptions) => ng.CompilerOptions): Promise<AngularCompilationResult>;
    protected collectDiagnostics(modes: DiagnosticModes): Iterable<ts.Diagnostic>;
    emitAffectedFiles(): Iterable<EmitFileResult>;
}
