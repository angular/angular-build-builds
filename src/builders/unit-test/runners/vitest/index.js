"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = __importDefault(require("node:assert"));
const dependency_checker_1 = require("../dependency-checker");
const build_options_1 = require("./build-options");
const executor_1 = require("./executor");
/**
 * A declarative definition of the Vitest test runner.
 */
const VitestTestRunner = {
    name: 'vitest',
    validateDependencies(options) {
        const checker = new dependency_checker_1.DependencyChecker(options.projectSourceRoot);
        checker.check('vitest');
        if (options.browsers?.length) {
            checker.check('@vitest/browser');
            checker.checkAny(['playwright', 'webdriverio'], 'The "browsers" option requires either "playwright" or "webdriverio" to be installed.');
        }
        else {
            // JSDOM is used when no browsers are specified
            checker.check('jsdom');
        }
        if (options.coverage) {
            checker.check('@vitest/coverage-v8');
        }
        checker.report();
    },
    getBuildOptions(options, baseBuildOptions) {
        return (0, build_options_1.getVitestBuildOptions)(options, baseBuildOptions);
    },
    async createExecutor(context, options, testEntryPointMappings) {
        const projectName = context.target?.project;
        (0, node_assert_1.default)(projectName, 'The builder requires a target.');
        return new executor_1.VitestExecutor(projectName, options, testEntryPointMappings);
    },
};
exports.default = VitestTestRunner;
//# sourceMappingURL=index.js.map