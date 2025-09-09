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
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const error_1 = require("../../../../utils/error");
const load_esm_1 = require("../../../../utils/load-esm");
const path_1 = require("../../../../utils/path");
const results_1 = require("../../../application/results");
const test_discovery_1 = require("../../test-discovery");
const browser_provider_1 = require("./browser-provider");
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
    constructor(projectName, options) {
        this.projectName = projectName;
        this.options = options;
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
        // The `getTestEntrypoints` function is used here to create the same mapping
        // that was used in `build-options.ts` to generate the build entry points.
        // This is a deliberate duplication to avoid a larger refactoring of the
        // builder's core interfaces to pass the entry points from the build setup
        // phase to the execution phase.
        if (this.testFileToEntryPoint.size === 0) {
            const { include, exclude = [], workspaceRoot, projectSourceRoot } = this.options;
            const testFiles = await (0, test_discovery_1.findTests)(include, exclude, workspaceRoot, projectSourceRoot);
            const entryPoints = (0, test_discovery_1.getTestEntrypoints)(testFiles, {
                projectSourceRoot,
                workspaceRoot,
                removeTestExtension: true,
            });
            for (const [entryPoint, testFile] of entryPoints) {
                this.testFileToEntryPoint.set(testFile, entryPoint);
                this.entryPointToTestFile.set(entryPoint + '.js', testFile);
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
    createVitestPlugins(testSetupFiles, browserOptions) {
        const { workspaceRoot } = this.options;
        return [
            {
                name: 'angular:project-init',
                // Type is incorrect. This allows a Promise<void>.
                // eslint-disable-next-line @typescript-eslint/no-misused-promises
                configureVitest: async (context) => {
                    // Create a subproject that can be configured with plugins for browser mode.
                    // Plugins defined directly in the vite overrides will not be present in the
                    // browser specific Vite instance.
                    await context.injectTestProjects({
                        test: {
                            name: this.projectName,
                            root: workspaceRoot,
                            globals: true,
                            setupFiles: testSetupFiles,
                            // Use `jsdom` if no browsers are explicitly configured.
                            // `node` is effectively no "environment" and the default.
                            environment: browserOptions.browser ? 'node' : 'jsdom',
                            browser: browserOptions.browser,
                            include: this.options.include,
                            ...(this.options.exclude ? { exclude: this.options.exclude } : {}),
                        },
                        plugins: [
                            {
                                name: 'angular:test-in-memory-provider',
                                enforce: 'pre',
                                resolveId: (id, importer) => {
                                    if (importer && (id[0] === '.' || id[0] === '/')) {
                                        let fullPath;
                                        if (this.testFileToEntryPoint.has(importer)) {
                                            fullPath = (0, path_1.toPosixPath)(node_path_1.default.join(this.options.workspaceRoot, id));
                                        }
                                        else {
                                            fullPath = (0, path_1.toPosixPath)(node_path_1.default.join(node_path_1.default.dirname(importer), id));
                                        }
                                        const relativePath = node_path_1.default.relative(this.options.workspaceRoot, fullPath);
                                        if (this.buildResultFiles.has((0, path_1.toPosixPath)(relativePath))) {
                                            return fullPath;
                                        }
                                    }
                                    if (this.testFileToEntryPoint.has(id)) {
                                        return id;
                                    }
                                    (0, node_assert_1.default)(this.buildResultFiles.size > 0, 'buildResult must be available for resolving.');
                                    const relativePath = node_path_1.default.relative(this.options.workspaceRoot, id);
                                    if (this.buildResultFiles.has((0, path_1.toPosixPath)(relativePath))) {
                                        return id;
                                    }
                                },
                                load: async (id) => {
                                    (0, node_assert_1.default)(this.buildResultFiles.size > 0, 'buildResult must be available for in-memory loading.');
                                    // Attempt to load as a source test file.
                                    const entryPoint = this.testFileToEntryPoint.get(id);
                                    let outputPath;
                                    if (entryPoint) {
                                        outputPath = entryPoint + '.js';
                                        // To support coverage exclusion of the actual test file, the virtual
                                        // test entry point only references the built and bundled intermediate file.
                                        return {
                                            code: `import "./${outputPath}";`,
                                        };
                                    }
                                    else {
                                        // Attempt to load as a built artifact.
                                        const relativePath = node_path_1.default.relative(this.options.workspaceRoot, id);
                                        outputPath = (0, path_1.toPosixPath)(relativePath);
                                    }
                                    const outputFile = this.buildResultFiles.get(outputPath);
                                    if (outputFile) {
                                        const sourceMapPath = outputPath + '.map';
                                        const sourceMapFile = this.buildResultFiles.get(sourceMapPath);
                                        const code = outputFile.origin === 'memory'
                                            ? Buffer.from(outputFile.contents).toString('utf-8')
                                            : await (0, promises_1.readFile)(outputFile.inputPath, 'utf-8');
                                        const map = sourceMapFile
                                            ? sourceMapFile.origin === 'memory'
                                                ? Buffer.from(sourceMapFile.contents).toString('utf-8')
                                                : await (0, promises_1.readFile)(sourceMapFile.inputPath, 'utf-8')
                                            : undefined;
                                        return {
                                            code,
                                            map: map ? JSON.parse(map) : undefined,
                                        };
                                    }
                                },
                            },
                            {
                                name: 'angular:html-index',
                                transformIndexHtml: () => {
                                    // Add all global stylesheets
                                    if (this.buildResultFiles.has('styles.css')) {
                                        return [
                                            {
                                                tag: 'link',
                                                attrs: { href: 'styles.css', rel: 'stylesheet' },
                                                injectTo: 'head',
                                            },
                                        ];
                                    }
                                    return [];
                                },
                            },
                        ],
                    });
                },
            },
        ];
    }
    async initializeVitest() {
        const { codeCoverage, reporters, workspaceRoot, browsers, debug, watch } = this.options;
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
        const plugins = this.createVitestPlugins(testSetupFiles, browserOptions);
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
            reporters: reporters ?? ['default'],
            watch,
            coverage: generateCoverageOption(codeCoverage),
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
function generateCoverageOption(codeCoverage) {
    if (!codeCoverage) {
        return {
            enabled: false,
        };
    }
    return {
        enabled: true,
        excludeAfterRemap: true,
        // Special handling for `exclude`/`reporters` due to an undefined value causing upstream failures
        ...(codeCoverage.exclude ? { exclude: codeCoverage.exclude } : {}),
        ...(codeCoverage.reporters
            ? { reporter: codeCoverage.reporters }
            : {}),
    };
}
