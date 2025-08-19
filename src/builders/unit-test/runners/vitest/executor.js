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
const node_crypto_1 = require("node:crypto");
const node_path_1 = __importDefault(require("node:path"));
const error_1 = require("../../../../utils/error");
const load_esm_1 = require("../../../../utils/load-esm");
const path_1 = require("../../../../utils/path");
const application_builder_1 = require("../../../karma/application_builder");
const browser_provider_1 = require("./browser-provider");
class VitestExecutor {
    vitest;
    projectName;
    options;
    outputPath;
    latestBuildResult;
    constructor(projectName, options) {
        this.projectName = projectName;
        this.options = options;
        this.outputPath = (0, path_1.toPosixPath)(node_path_1.default.join(options.workspaceRoot, generateOutputPath()));
    }
    async *execute(buildResult) {
        await (0, application_builder_1.writeTestFiles)(buildResult.files, this.outputPath);
        this.latestBuildResult = buildResult;
        this.vitest ??= await this.initializeVitest();
        // Check if all the tests pass to calculate the result
        const testModules = this.vitest.state.getTestModules();
        yield { success: testModules.every((testModule) => testModule.ok()) };
    }
    async [Symbol.asyncDispose]() {
        await this.vitest?.close();
    }
    async initializeVitest() {
        const { codeCoverage, reporters, watch, workspaceRoot, setupFiles, browsers, debug } = this.options;
        const { outputPath, projectName, latestBuildResult } = this;
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
        (0, node_assert_1.default)(latestBuildResult, 'buildResult must be available before initializing vitest');
        // Add setup file entries for TestBed initialization and project polyfills
        const testSetupFiles = ['init-testbed.js', ...setupFiles];
        // TODO: Provide additional result metadata to avoid needing to extract based on filename
        const polyfillsFile = Object.keys(latestBuildResult.files).find((f) => f === 'polyfills.js');
        if (polyfillsFile) {
            testSetupFiles.unshift(polyfillsFile);
        }
        const debugOptions = debug
            ? {
                inspectBrk: true,
                isolate: false,
                fileParallelism: false,
            }
            : {};
        return startVitest('test', undefined /* cliFilters */, {
            // Disable configuration file resolution/loading
            config: false,
            root: workspaceRoot,
            project: ['base', projectName],
            name: 'base',
            include: [],
            reporters: reporters ?? ['default'],
            watch,
            coverage: generateCoverageOption(codeCoverage, workspaceRoot, this.outputPath),
            ...debugOptions,
        }, {
            plugins: [
                {
                    name: 'angular:project-init',
                    async configureVitest(context) {
                        // Create a subproject that can be configured with plugins for browser mode.
                        // Plugins defined directly in the vite overrides will not be present in the
                        // browser specific Vite instance.
                        const [project] = await context.injectTestProjects({
                            test: {
                                name: projectName,
                                root: outputPath,
                                globals: true,
                                setupFiles: testSetupFiles,
                                // Use `jsdom` if no browsers are explicitly configured.
                                // `node` is effectively no "environment" and the default.
                                environment: browserOptions.browser ? 'node' : 'jsdom',
                                browser: browserOptions.browser,
                            },
                            plugins: [
                                {
                                    name: 'angular:html-index',
                                    transformIndexHtml: () => {
                                        (0, node_assert_1.default)(latestBuildResult, 'buildResult must be available for HTML index transformation.');
                                        // Add all global stylesheets
                                        const styleFiles = Object.entries(latestBuildResult.files).filter(([file]) => file === 'styles.css');
                                        return styleFiles.map(([href]) => ({
                                            tag: 'link',
                                            attrs: { href, rel: 'stylesheet' },
                                            injectTo: 'head',
                                        }));
                                    },
                                },
                            ],
                        });
                        // Adjust coverage excludes to not include the otherwise automatically inserted included unit tests.
                        // Vite does this as a convenience but is problematic for the bundling strategy employed by the
                        // builder's test setup. To workaround this, the excludes are adjusted here to only automatically
                        // exclude the TypeScript source test files.
                        project.config.coverage.exclude = [
                            ...(codeCoverage?.exclude ?? []),
                            '**/*.{test,spec}.?(c|m)ts',
                        ];
                    },
                },
            ],
        });
    }
}
exports.VitestExecutor = VitestExecutor;
function generateOutputPath() {
    const datePrefix = new Date().toISOString().replaceAll(/[-:.]/g, '');
    const uuidSuffix = (0, node_crypto_1.randomUUID)().slice(0, 8);
    return node_path_1.default.join('dist', 'test-out', `${datePrefix}-${uuidSuffix}`);
}
function generateCoverageOption(codeCoverage, workspaceRoot, outputPath) {
    if (!codeCoverage) {
        return {
            enabled: false,
        };
    }
    return {
        enabled: true,
        excludeAfterRemap: true,
        include: [`${(0, path_1.toPosixPath)(node_path_1.default.relative(workspaceRoot, outputPath))}/**`],
        // Special handling for `reporter` due to an undefined value causing upstream failures
        ...(codeCoverage.reporters
            ? { reporter: codeCoverage.reporters }
            : {}),
    };
}
