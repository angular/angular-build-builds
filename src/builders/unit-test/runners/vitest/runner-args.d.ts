/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
/**
 * @fileoverview
 * Parses and validates the Vitest command line arguments provided via the builder's
 * `runnerArgs` option.
 *
 * Vitest's own command line parser is used to parse the arguments so that the value coercion and
 * dot-notation behavior matches the Vitest documentation. However, that parser accepts unknown
 * options, command names, and test file filters without error. The parsed result is therefore
 * validated against an explicit list of supported options.
 */
import type { CliOptions } from 'vitest/node';
/**
 * The portion of the `parseCLI` function from `vitest/node` used to parse the arguments.
 */
export type VitestCliParser = (argv: string[]) => {
    filter: string[];
    options: object;
};
/**
 * The Vitest options created from the builder's `runnerArgs` option.
 */
export interface RunnerArgOptions {
    /** Options for the Vitest CLI level configuration. */
    cli: CliOptions;
    /**
     * Options for the Vitest project configuration.
     * Vitest only forwards a version specific subset of CLI options to a configured project.
     * The project applicable options are provided directly to the project to avoid relying
     * on that subset.
     */
    project: Record<string, unknown>;
}
/**
 * Parses and validates the Vitest command line arguments provided via the `runnerArgs` option.
 *
 * @param runnerArgs The Vitest command line arguments.
 * @param parseCLI The `parseCLI` function from the project's `vitest/node` package.
 * @returns The validated Vitest options.
 * @throws An error describing each argument that is not supported.
 */
export declare function parseRunnerArgs(runnerArgs: readonly string[], parseCLI: VitestCliParser): RunnerArgOptions;
