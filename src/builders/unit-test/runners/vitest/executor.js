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
exports.VitestExecutor = void 0;
const node_assert_1 = __importDefault(require("node:assert"));
const node_path_1 = __importDefault(require("node:path"));
const picomatch_1 = require("picomatch");
const error_1 = require("../../../../utils/error");
const path_1 = require("../../../../utils/path");
const results_1 = require("../../../application/results");
const browser_provider_1 = require("./browser-provider");
const configuration_1 = require("./configuration");
const plugins_1 = require("./plugins");
class VitestExecutor {
    vitest;
    normalizePath;
    projectName;
    options;
    buildResultFiles = new Map();
    // This is a reverse map of the entry points created in `build-options.ts`.
    // It is used by the in-memory provider plugin to map the requested test file
    // path back to its bundled output path.
    // Example: `Map<'/path/to/src/app.spec.ts', 'spec-src-app-spec'>`
    testFileToEntryPoint = new Map();
    entryPointToTestFile = new Map();
    constructor(projectName, options, testEntryPointMappings) {
        this.projectName = projectName;
        this.options = options;
        if (testEntryPointMappings) {
            for (const [entryPoint, testFile] of testEntryPointMappings) {
                this.testFileToEntryPoint.set(testFile, entryPoint);
                this.entryPointToTestFile.set(entryPoint + '.js', testFile);
            }
        }
    }
    async *execute(buildResult) {
        this.normalizePath ??= (await Promise.resolve().then(() => __importStar(require('vite')))).normalizePath;
        if (buildResult.kind === results_1.ResultKind.Full) {
            this.buildResultFiles.clear();
            for (const [path, file] of Object.entries(buildResult.files)) {
                this.buildResultFiles.set(this.normalizePath(path), file);
            }
        }
        else {
            for (const file of buildResult.removed) {
                this.buildResultFiles.delete(this.normalizePath(file.path));
            }
            for (const [path, file] of Object.entries(buildResult.files)) {
                this.buildResultFiles.set(this.normalizePath(path), file);
            }
        }
        // Initialize Vitest if not already present.
        this.vitest ??= await this.initializeVitest();
        const vitest = this.vitest;
        let testResults;
        if (buildResult.kind === results_1.ResultKind.Incremental) {
            // To rerun tests, Vitest needs the original test file paths, not the output paths.
            const modifiedSourceFiles = new Set();
            for (const modifiedFile of buildResult.modified) {
                // The `modified` files in the build result are the output paths.
                // We need to find the original source file path to pass to Vitest.
                const source = this.entryPointToTestFile.get(modifiedFile);
                if (source) {
                    modifiedSourceFiles.add(source);
                }
                vitest.invalidateFile((0, path_1.toPosixPath)(node_path_1.default.join(this.options.workspaceRoot, modifiedFile)));
            }
            const specsToRerun = [];
            for (const file of modifiedSourceFiles) {
                vitest.invalidateFile(file);
                const specs = vitest.getModuleSpecifications(file);
                if (specs) {
                    specsToRerun.push(...specs);
                }
            }
            if (specsToRerun.length > 0) {
                testResults = await vitest.rerunTestSpecifications(specsToRerun);
            }
        }
        // Check if all the tests pass to calculate the result
        const testModules = testResults?.testModules ?? this.vitest.state.getTestModules();
        yield { success: testModules.every((testModule) => testModule.ok()) };
    }
    async [Symbol.asyncDispose]() {
        await this.vitest?.close();
    }
    prepareSetupFiles() {
        const { setupFiles } = this.options;
        // Add setup file entries for TestBed initialization and project polyfills
        const testSetupFiles = ['init-testbed.js', ...setupFiles];
        // TODO: Provide additional result metadata to avoid needing to extract based on filename
        if (this.buildResultFiles.has('polyfills.js')) {
            testSetupFiles.unshift('polyfills.js');
        }
        return testSetupFiles;
    }
    async initializeVitest() {
        const { coverage, reporters, outputFile, workspaceRoot, browsers, debug, watch, browserViewport, ui, } = this.options;
        let vitestNodeModule;
        let vitestCoverageModule;
        try {
            vitestCoverageModule = await Promise.resolve().then(() => __importStar(require('vitest/coverage')));
            vitestNodeModule = await Promise.resolve().then(() => __importStar(require('vitest/node')));
        }
        catch (error) {
            (0, error_1.assertIsError)(error);
            if (error.code !== 'ERR_MODULE_NOT_FOUND') {
                throw error;
            }
            throw new Error('The `vitest` package was not found. Please install the package and rerun the test command.');
        }
        const { startVitest } = vitestNodeModule;
        // Augment BaseCoverageProvider to include logic to support the built virtual files.
        // Temporary workaround to avoid the direct filesystem checks in the base provider that
        // were introduced in v4. Also ensures that all built virtual files are available.
        const builtVirtualFiles = this.buildResultFiles;
        vitestCoverageModule.BaseCoverageProvider.prototype.isIncluded = function (filename) {
            const relativeFilename = node_path_1.default.relative(workspaceRoot, filename);
            if (!this.options.include || builtVirtualFiles.has(relativeFilename)) {
                return !(0, picomatch_1.isMatch)(relativeFilename, this.options.exclude);
            }
            else {
                return (0, picomatch_1.isMatch)(relativeFilename, this.options.include, {
                    ignore: this.options.exclude,
                });
            }
        };
        // Setup vitest browser options if configured
        const browserOptions = await (0, browser_provider_1.setupBrowserConfiguration)(browsers, debug, this.options.projectSourceRoot, browserViewport);
        if (browserOptions.errors?.length) {
            throw new Error(browserOptions.errors.join('\n'));
        }
        (0, node_assert_1.default)(this.buildResultFiles.size > 0, 'buildResult must be available before initializing vitest');
        const testSetupFiles = this.prepareSetupFiles();
        const plugins = (0, plugins_1.createVitestPlugins)({
            workspaceRoot,
            projectSourceRoot: this.options.projectSourceRoot,
            projectName: this.projectName,
            include: this.options.include,
            exclude: this.options.exclude,
            buildResultFiles: this.buildResultFiles,
            testFileToEntryPoint: this.testFileToEntryPoint,
        });
        const debugOptions = debug
            ? {
                inspectBrk: true,
                isolate: false,
                fileParallelism: false,
            }
            : {};
        const runnerConfig = this.options.runnerConfig;
        const externalConfigPath = runnerConfig === true
            ? await (0, configuration_1.findVitestBaseConfig)([this.options.projectRoot, this.options.workspaceRoot])
            : runnerConfig;
        const projectName = this.projectName;
        return startVitest('test', undefined, {
            config: externalConfigPath,
            root: workspaceRoot,
            project: projectName,
            outputFile,
            testNamePattern: this.options.filter,
            watch,
            ui,
            ...debugOptions,
        }, {
            test: {
                coverage: await generateCoverageOption(coverage, this.projectName),
                ...(reporters ? { reporters } : {}),
                projects: [
                    {
                        extends: externalConfigPath || true,
                        test: {
                            name: projectName,
                            globals: true,
                            setupFiles: testSetupFiles,
                            ...(this.options.exclude ? { exclude: this.options.exclude } : {}),
                            browser: browserOptions.browser,
                            // Use `jsdom` if no browsers are explicitly configured.
                            ...(browserOptions.browser ? {} : { environment: 'jsdom' }),
                            ...(this.options.include ? { include: this.options.include } : {}),
                        },
                        optimizeDeps: {
                            noDiscovery: true,
                        },
                        plugins,
                    },
                ],
            },
            server: {
                // Disable the actual file watcher. The boolean watch option above should still
                // be enabled as it controls other internal behavior related to rerunning tests.
                watch: null,
            },
        });
    }
}
exports.VitestExecutor = VitestExecutor;
async function generateCoverageOption(coverage, projectName) {
    let defaultExcludes = [];
    if (coverage.exclude) {
        try {
            const vitestConfig = await Promise.resolve().then(() => __importStar(require('vitest/config')));
            defaultExcludes = vitestConfig.coverageConfigDefaults.exclude;
        }
        catch { }
    }
    return {
        enabled: coverage.enabled,
        excludeAfterRemap: true,
        include: coverage.include,
        reportsDirectory: (0, path_1.toPosixPath)(node_path_1.default.join('coverage', projectName)),
        thresholds: coverage.thresholds,
        watermarks: coverage.watermarks,
        // Special handling for `exclude`/`reporters` due to an undefined value causing upstream failures
        ...(coverage.exclude
            ? {
                exclude: [
                    // Augment the default exclude https://vitest.dev/config/#coverage-exclude
                    // with the user defined exclusions
                    ...coverage.exclude,
                    ...defaultExcludes,
                ],
            }
            : {}),
        ...(coverage.reporters
            ? { reporter: coverage.reporters }
            : {}),
    };
}
//# sourceMappingURL=executor.js.map