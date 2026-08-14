/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import type { PartialMessage } from 'esbuild';
import { type MessagePort } from 'node:worker_threads';
import type { AngularCompilationResult, DiagnosticModes } from './angular-compilation';
export interface InitRequest {
    jit: boolean;
    browserOnlyBuild: boolean;
    tsconfig: string;
    fileReplacements?: Record<string, string>;
    stylesheetPort: MessagePort;
    optionsPort: MessagePort;
    optionsSignal: Int32Array;
    webWorkerPort: MessagePort;
    webWorkerSignal: Int32Array;
}
export declare function initialize(request: InitRequest): Promise<AngularCompilationResult>;
export declare function diagnose(modes: DiagnosticModes): Promise<{
    errors?: PartialMessage[];
    warnings?: PartialMessage[];
    timings?: Record<string, number[]>;
}>;
export declare function emit(): Promise<import("./angular-compilation").EmitFileResult[]>;
export declare function update(files: Set<string>): void;
