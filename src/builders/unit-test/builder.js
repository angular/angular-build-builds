"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.execute = execute;
const options_1 = require("./options");
const karma_1 = require("./runners/karma");
const vitest_1 = require("./runners/vitest");
/**
 * @experimental Direct usage of this function is considered experimental.
 */
async function* execute(options, context, extensions) {
    // Determine project name from builder context target
    const projectName = context.target?.project;
    if (!projectName) {
        context.logger.error(`The builder requires a target to be specified.`);
        return;
    }
    context.logger.warn(`NOTE: The "unit-test" builder is currently EXPERIMENTAL and not ready for production use.`);
    const normalizedOptions = await (0, options_1.normalizeOptions)(context, projectName, options);
    const { runnerName } = normalizedOptions;
    switch (runnerName) {
        case 'karma':
            yield* await (0, karma_1.useKarmaRunner)(context, normalizedOptions);
            break;
        case 'vitest':
            yield* (0, vitest_1.runVitest)(normalizedOptions, context, extensions);
            break;
        default:
            context.logger.error('Unknown test runner: ' + runnerName);
            break;
    }
}
