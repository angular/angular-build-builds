/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import type * as ng from '@angular/compiler-cli';
import { AngularHostOptions } from '../angular-host';
import { AngularCompilation, AngularCompilationResult } from './angular-compilation';
export declare class NoopCompilation extends AngularCompilation {
    initialize(tsconfig: string, hostOptions: AngularHostOptions, compilerOptionsTransformer?: (compilerOptions: ng.CompilerOptions) => ng.CompilerOptions): Promise<AngularCompilationResult>;
    protected collectDiagnostics(): never;
    emitAffectedFiles(): never;
}
