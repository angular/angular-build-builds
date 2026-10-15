/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import type { BuilderOutput } from '@angular-devkit/architect';
/**
 * Encapsulates the diagnostic messages (`errors`, `warnings`, and `logs`) and
 * builder output status for a single library build iteration.
 */
export declare class ExecutionResult {
    #private;
    /** Formatted error messages produced during the build iteration. */
    get errors(): readonly string[];
    /** Formatted warning messages produced during the build iteration. */
    get warnings(): readonly string[];
    /** Informational log messages produced during the build iteration. */
    get logs(): readonly string[];
    /** Whether any errors have been recorded in the build iteration. */
    get hasErrors(): boolean;
    /** Architect builder output status for the build iteration. */
    get output(): BuilderOutput;
    /** Records an informational log message. */
    addLog(value: string): void;
    /** Records a formatted error message. */
    addError(error: string): void;
    /** Records multiple formatted error messages. */
    addErrors(errors: Iterable<string>): void;
    /** Records a formatted warning message. */
    addWarning(warning: string): void;
    /** Records multiple formatted warning messages. */
    addWarnings(warnings: Iterable<string>): void;
}
