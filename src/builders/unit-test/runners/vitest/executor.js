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
exports.VitestExecutor = void 0;
const node_assert_1 = __importDefault(require("node:assert"));
const node_path_1 = __importDefault(require("node:path"));
const error_1 = require("../../../../utils/error");
const load_esm_1 = require("../../../../utils/load-esm");
const path_1 = require("../../../../utils/path");
const results_1 = require("../../../application/results");
const browser_provider_1 = require("./browser-provider");
const plugins_1 = require("./plugins");
class VitestExecutor {
    vitest;
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
        if (buildResult.kind === results_1.ResultKind.Full) {
            this.buildResultFiles.clear();
            for (const [path, file] of Object.entries(buildResult.files)) {
                this.buildResultFiles.set(path, file);
            }
        }
        else {
            for (const file of buildResult.removed) {
                this.buildResultFiles.delete(file.path);
            }
            for (const [path, file] of Object.entries(buildResult.files)) {
                this.buildResultFiles.set(path, file);
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
        const { coverage, reporters, outputFile, workspaceRoot, browsers, debug, watch } = this.options;
        let vitestNodeModule;
        try {
            vitestNodeModule = await (0, load_esm_1.loadEsmModule)('vitest/node');
        }
        catch (error) {
            (0, error_1.assertIsError)(error);
            if (error.code !== 'ERR_MODULE_NOT_FOUND') {
                throw error;
            }
            throw new Error('The `vitest` package was not found. Please install the package and rerun the test command.');
        }
        const { startVitest } = vitestNodeModule;
        // Setup vitest browser options if configured
        const browserOptions = (0, browser_provider_1.setupBrowserConfiguration)(browsers, debug, this.options.projectSourceRoot);
        if (browserOptions.errors?.length) {
            throw new Error(browserOptions.errors.join('\n'));
        }
        (0, node_assert_1.default)(this.buildResultFiles.size > 0, 'buildResult must be available before initializing vitest');
        const testSetupFiles = this.prepareSetupFiles();
        const plugins = (0, plugins_1.createVitestPlugins)(this.options, testSetupFiles, browserOptions, {
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
        return startVitest('test', undefined, {
            // Disable configuration file resolution/loading
            config: false,
            root: workspaceRoot,
            project: ['base', this.projectName],
            name: 'base',
            include: [],
            testNamePattern: this.options.filter,
            reporters: reporters ?? ['default'],
            outputFile,
            watch,
            coverage: generateCoverageOption(coverage, this.projectName),
            ...debugOptions,
        }, {
            server: {
                // Disable the actual file watcher. The boolean watch option above should still
                // be enabled as it controls other internal behavior related to rerunning tests.
                watch: null,
            },
            plugins,
        });
    }
}
exports.VitestExecutor = VitestExecutor;
function generateCoverageOption(coverage, projectName) {
    if (!coverage) {
        return {
            enabled: false,
        };
    }
    return {
        enabled: true,
        all: coverage.all,
        excludeAfterRemap: true,
        include: coverage.include,
        reportsDirectory: (0, path_1.toPosixPath)(node_path_1.default.join('coverage', projectName)),
        thresholds: coverage.thresholds,
        watermarks: coverage.watermarks,
        // Special handling for `exclude`/`reporters` due to an undefined value causing upstream failures
        ...(coverage.exclude ? { exclude: coverage.exclude } : {}),
        ...(coverage.reporters
            ? { reporter: coverage.reporters }
            : {}),
    };
}
