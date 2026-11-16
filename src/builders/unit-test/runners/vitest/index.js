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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = __importDefault(require("node:assert"));
const dependency_checker_1 = require("../dependency-checker");
const build_options_1 = require("./build-options");
const executor_1 = require("./executor");
const runner_args_1 = require("./runner-args");
/**
 * A declarative definition of the Vitest test runner.
 */
const VitestTestRunner = {
    name: 'vitest',
    validateDependencies(options) {
        const checker = new dependency_checker_1.DependencyChecker(options.projectSourceRoot);
        checker.check('vitest');
        // If a runnerConfig is present, only check for 'vitest' itself.
        // Custom configuration may include unknown browsers or other setup
        // that doesn't follow the default dependency requirements.
        if (options.runnerConfig) {
            checker.report();
            return;
        }
        if (options.browsers?.length) {
            if (process.versions.webcontainer) {
                checker.check('@vitest/browser-preview');
            }
            else {
                checker.checkAny(['@vitest/browser-playwright', '@vitest/browser-webdriverio', '@vitest/browser-preview'], 'The "browsers" option requires either ' +
                    '"@vitest/browser-playwright", "@vitest/browser-webdriverio", or "@vitest/browser-preview" to be installed.');
            }
        }
        else {
            // DOM emulation is used when no browsers are specified
            checker.checkAny(['jsdom', 'happy-dom'], 'A DOM environment is required for non-browser tests. Please install either "jsdom" or "happy-dom".');
        }
        if (options.coverage.enabled) {
            checker.checkAny(['@vitest/coverage-v8', '@vitest/coverage-istanbul'], 'Code coverage requires either "@vitest/coverage-v8" or "@vitest/coverage-istanbul" to be installed.');
        }
        checker.report();
    },
    getBuildOptions(options, baseBuildOptions, logger) {
        return (0, build_options_1.getVitestBuildOptions)(options, baseBuildOptions, logger);
    },
    async createExecutor(context, options, testEntryPointMappings) {
        const projectName = context.target?.project;
        (0, node_assert_1.default)(projectName, 'The builder requires a target.');
        if (!!process.versions.webcontainer && options.browsers?.length) {
            context.logger.info(`Webcontainer environment detected. Using '@vitest/browser-preview' for browser-based tests.`);
        }
        if (typeof options.runnerConfig === 'string') {
            context.logger.info(`Using Vitest configuration file: ${options.runnerConfig}`);
        }
        else if (options.runnerConfig) {
            context.logger.info('Automatically searching for and using Vitest configuration file.');
        }
        // Parse and validate any additional Vitest arguments prior to the build to fail fast.
        let runnerArgOptions;
        if (options.runnerArgs) {
            const { parseCLI } = await Promise.resolve().then(() => __importStar(require('vitest/node')));
            runnerArgOptions = (0, runner_args_1.parseRunnerArgs)(options.runnerArgs, parseCLI);
        }
        return new executor_1.VitestExecutor(projectName, options, testEntryPointMappings, context.logger, runnerArgOptions);
    },
};
exports.default = VitestTestRunner;
//# sourceMappingURL=index.js.map