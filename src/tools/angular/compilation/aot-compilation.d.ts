/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import ts from 'typescript';
import { AngularHostOptions } from '../angular-host';
import { type AngularCompilationResult, DiagnosticModes, type EmitFileResult } from './angular-compilation';
import type { CompilerOptionOverrides } from './compiler-options';
import { TypeScriptCompilation } from './typescript-compilation';
export declare class AotCompilation extends TypeScriptCompilation {
    #private;
    private readonly browserOnlyBuild;
    constructor(browserOnlyBuild: boolean);
    initialize(tsconfig: string, hostOptions: AngularHostOptions, compilerOptionOverrides?: CompilerOptionOverrides, buildType?: 'application' | 'library'): Promise<AngularCompilationResult>;
    protected collectDiagnostics(modes: DiagnosticModes): Iterable<ts.Diagnostic>;
    emitAffectedFiles(): Iterable<EmitFileResult>;
}
/**
 * When TypeScript's `BuilderProgram.emitNextAffectedFile` emits `.d.ts`-only (`emitOnly = Dts`)
 * for a transitive importer, TypeScript skips `transformers.before`. However, Angular's
 * `declarationTransformFactory` in `afterDeclarations` relies on `ivyTransformFactory` in
 * `before` having compiled the file's classes to populate `dtsTransforms`.
 *
 * This helper ensures `before` transformers have executed on the original `SourceFile` prior to
 * `afterDeclarations`, and caches the transformed `SourceFile` so a subsequent `.js` emit for the
 * same file does not re-execute `before` transformers.
 */
export declare function ensurePreDeclarationTransformers(transformers: ts.CustomTransformers): void;
