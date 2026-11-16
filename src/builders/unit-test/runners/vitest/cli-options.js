"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createVitestCliOptions = createVitestCliOptions;
/**
 * Creates the Vitest CLI level options from the normalized builder options.
 * These are the options that Vitest would otherwise receive from its own command line.
 *
 * @param options The normalized builder options to convert.
 * @param project The name of the Vitest project to execute.
 * @param configPath The path to an external Vitest configuration file, if any.
 * @param runnerArgOptions The Vitest CLI options from the `runnerArgs` builder option, if any.
 * The options created from the other builder options take precedence over these.
 * @returns The Vitest CLI options.
 */
function createVitestCliOptions(options, project, configPath, runnerArgOptions) {
    const { workspaceRoot, watch, outputFile, cacheOptions, filter, ui, debug } = options;
    return {
        ...runnerArgOptions,
        config: configPath,
        root: workspaceRoot,
        project,
        watch,
        ...(outputFile !== undefined ? { outputFile } : {}),
        ...(cacheOptions.enabled ? {} : { cache: false }),
        ...(filter !== undefined ? { testNamePattern: filter } : {}),
        ...(typeof ui === 'boolean' ? { ui } : {}),
        ...(debug ? { inspectBrk: true, isolate: false, fileParallelism: false } : {}),
    };
}
//# sourceMappingURL=cli-options.js.map