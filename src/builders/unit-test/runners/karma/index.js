"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const executor_1 = require("./executor");
/**
 * A declarative definition of the Karma test runner.
 */
const KarmaTestRunner = {
    name: 'karma',
    isStandalone: true,
    getBuildOptions() {
        return {
            buildOptions: {},
        };
    },
    async createExecutor(context, options) {
        return new executor_1.KarmaExecutor(context, options);
    },
};
exports.default = KarmaTestRunner;
