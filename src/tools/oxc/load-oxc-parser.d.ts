/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
/**
 * Synchronous subset of the `oxc-parser` module.
 *
 * Async `parse()` is intentionally excluded because it spawns internal `wasi-worker.mjs`
 * threads that do not execute the WASI compatibility shim and will fail to initialize.
 */
export type OxcParser = Omit<typeof import('oxc-parser'), 'parse'>;
/**
 * Lazily loads and caches `oxc-parser`, applying a scoped WebAssembly (WASI) compatibility
 * shim when running in WebContainer environments or when NAPI-RS WASI mode is forced.
 */
export declare function loadOxcParser(): OxcParser;
