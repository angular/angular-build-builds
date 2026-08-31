/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { AngularHostOptions } from '../angular-host';
import { AngularCompilation, AngularCompilationResult } from './angular-compilation';
import type { CompilerOptionOverrides } from './compiler-options';
/**
 * An Angular compilation that performs no actual compilation or code emission.
 * Used for secondary compilation contexts where only the resolved compiler options
 * and configuration state are needed.
 */
export declare class NoopCompilation extends AngularCompilation {
    initialize(tsconfig: string, hostOptions: AngularHostOptions, compilerOptionOverrides?: CompilerOptionOverrides): Promise<AngularCompilationResult>;
    emitAffectedFiles(): never;
}
