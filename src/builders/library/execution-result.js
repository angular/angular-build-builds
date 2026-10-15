"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutionResult = void 0;
/**
 * Encapsulates the diagnostic messages (`errors`, `warnings`, and `logs`) and
 * builder output status for a single library build iteration.
 */
class ExecutionResult {
    #errors = [];
    #warnings = [];
    #logs = [];
    /** Formatted error messages produced during the build iteration. */
    get errors() {
        return this.#errors;
    }
    /** Formatted warning messages produced during the build iteration. */
    get warnings() {
        return this.#warnings;
    }
    /** Informational log messages produced during the build iteration. */
    get logs() {
        return this.#logs;
    }
    /** Whether any errors have been recorded in the build iteration. */
    get hasErrors() {
        return this.#errors.length > 0;
    }
    /** Architect builder output status for the build iteration. */
    get output() {
        return {
            success: !this.hasErrors,
        };
    }
    /** Records an informational log message. */
    addLog(value) {
        this.#logs.push(value);
    }
    /** Records a formatted error message. */
    addError(error) {
        this.#errors.push(error);
    }
    /** Records multiple formatted error messages. */
    addErrors(errors) {
        for (const error of errors) {
            this.#errors.push(error);
        }
    }
    /** Records a formatted warning message. */
    addWarning(warning) {
        this.#warnings.push(warning);
    }
    /** Records multiple formatted warning messages. */
    addWarnings(warnings) {
        for (const warning of warnings) {
            this.#warnings.push(warning);
        }
    }
}
exports.ExecutionResult = ExecutionResult;
//# sourceMappingURL=execution-result.js.map