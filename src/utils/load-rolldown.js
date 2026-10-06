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
exports.loadRolldown = loadRolldown;
const MIMALLOC_PURGE_DELAY = 'MIMALLOC_PURGE_DELAY';
let rolldownPromise;
/**
 * Dynamically loads the `rolldown` module while configuring its embedded
 * mimalloc v3 allocator to immediately purge freed arena memory.
 *
 * Rolldown's native binding statically links mimalloc v3, which defaults to a
 * 4-second arena purge delay (`MIMALLOC_PURGE_DELAY=1000` * `MIMALLOC_ARENA_PURGE_MULT=4`)
 * and only triggers purges cooperatively during subsequent allocations. In single-run
 * CLI builds where Rolldown is not invoked again after bundling completes, non-zero
 * purge delays prevent freed arena pages from being decommitted back to the OS,
 * leading to high peak RSS during post-bundle stages.
 *
 * Because mimalloc reads and caches environment options synchronously when the native
 * `.node` addon is first loaded (`mi_process_init` -> `_mi_options_init`), temporarily
 * setting `MIMALLOC_PURGE_DELAY=0` during the initial `import('rolldown')` call
 * configures Rolldown's allocator without leaving the environment variable set for
 * subsequent code or child processes.
 *
 * @returns A promise that resolves to the `rolldown` module namespace.
 */
function loadRolldown() {
    if (!rolldownPromise) {
        const hasCustomPurgeDelay = Object.hasOwn(process.env, MIMALLOC_PURGE_DELAY);
        if (!hasCustomPurgeDelay) {
            process.env[MIMALLOC_PURGE_DELAY] = '0';
        }
        rolldownPromise = Promise.resolve().then(() => __importStar(require('rolldown'))).finally(() => {
            if (!hasCustomPurgeDelay) {
                delete process.env[MIMALLOC_PURGE_DELAY];
            }
        });
    }
    return rolldownPromise;
}
//# sourceMappingURL=load-rolldown.js.map