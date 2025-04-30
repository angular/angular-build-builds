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
exports.execute = execute;
const node_assert_1 = __importDefault(require("node:assert"));
const node_crypto_1 = require("node:crypto");
const node_module_1 = require("node:module");
const node_path_1 = __importDefault(require("node:path"));
const virtual_module_plugin_1 = require("../../tools/esbuild/virtual-module-plugin");
const load_esm_1 = require("../../utils/load-esm");
const application_1 = require("../application");
const results_1 = require("../application/results");
const schema_1 = require("../application/schema");
const application_builder_1 = require("../karma/application_builder");
const find_tests_1 = require("../karma/find-tests");
const karma_bridge_1 = require("./karma-bridge");
const options_1 = require("./options");
/**
 * @experimental Direct usage of this function is considered experimental.
 */
async function* execute(options, context, extensions = {}) {
    // Determine project name from builder context target
    const projectName = context.target?.project;
    if (!projectName) {
        context.logger.error(`The "${context.builder.builderName}" builder requires a target to be specified.`);
        return;
    }
    context.logger.warn(`NOTE: The "${context.builder.builderName}" builder is currently EXPERIMENTAL and not ready for production use.`);
    const normalizedOptions = await (0, options_1.normalizeOptions)(context, projectName, options);
    const { projectSourceRoot, workspaceRoot, runnerName } = normalizedOptions;
    // Translate options and use karma builder directly if specified
    if (runnerName === 'karma') {
        const karmaBridge = await (0, karma_bridge_1.useKarmaBuilder)(context, normalizedOptions);
        yield* karmaBridge;
        return;
    }
    if (runnerName !== 'vitest') {
        context.logger.error('Unknown test runner: ' + runnerName);
        return;
    }
    // Find test files
    const testFiles = await (0, find_tests_1.findTests)(normalizedOptions.include, normalizedOptions.exclude, workspaceRoot, projectSourceRoot);
    if (testFiles.length === 0) {
        context.logger.error('No tests found.');
        return { success: false };
    }
    const entryPoints = (0, find_tests_1.getTestEntrypoints)(testFiles, { projectSourceRoot, workspaceRoot });
    entryPoints.set('init-testbed', 'angular:test-bed-init');
    const { startVitest } = await (0, load_esm_1.loadEsmModule)('vitest/node');
    // Setup test file build options based on application build target options
    const buildTargetOptions = (await context.validateOptions(await context.getTargetOptions(normalizedOptions.buildTarget), await context.getBuilderNameForTarget(normalizedOptions.buildTarget)));
    if (buildTargetOptions.polyfills?.includes('zone.js')) {
        buildTargetOptions.polyfills.push('zone.js/testing');
    }
    const outputPath = node_path_1.default.join(context.workspaceRoot, 'dist/test-out', (0, node_crypto_1.randomUUID)());
    const buildOptions = {
        ...buildTargetOptions,
        watch: normalizedOptions.watch,
        outputPath,
        index: false,
        browser: undefined,
        server: undefined,
        localize: false,
        budgets: [],
        serviceWorker: false,
        appShell: false,
        ssr: false,
        prerender: false,
        sourceMap: { scripts: true, vendor: false, styles: false },
        outputHashing: schema_1.OutputHashing.None,
        optimization: false,
        tsConfig: normalizedOptions.tsConfig,
        entryPoints,
        externalDependencies: ['vitest', ...(buildTargetOptions.externalDependencies ?? [])],
    };
    extensions ??= {};
    extensions.codePlugins ??= [];
    const virtualTestBedInit = (0, virtual_module_plugin_1.createVirtualModulePlugin)({
        namespace: 'angular:test-bed-init',
        loadContent: async () => {
            const contents = [
                // Initialize the Angular testing environment
                `import { getTestBed } from '@angular/core/testing';`,
                `import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';`,
                `getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting(), {`,
                `  errorOnUnknownElements: true,`,
                `  errorOnUnknownProperties: true,`,
                '});',
            ];
            return {
                contents: contents.join('\n'),
                loader: 'js',
                resolveDir: projectSourceRoot,
            };
        },
    });
    extensions.codePlugins.unshift(virtualTestBedInit);
    let instance;
    // Setup vitest browser options if configured
    let browser;
    if (normalizedOptions.browsers) {
        const provider = findBrowserProvider(projectSourceRoot);
        if (!provider) {
            context.logger.error('The "browsers" option requires either "playwright" or "webdriverio" to be installed within the project.' +
                ' Please install one of these packages and rerun the test command.');
            return { success: false };
        }
        browser = {
            enabled: true,
            provider,
            instances: normalizedOptions.browsers.map((browserName) => ({
                browser: browserName,
            })),
        };
    }
    for await (const result of (0, application_1.buildApplicationInternal)(buildOptions, context, extensions)) {
        if (result.kind === results_1.ResultKind.Failure) {
            continue;
        }
        else if (result.kind !== results_1.ResultKind.Full) {
            node_assert_1.default.fail('A full build result is required from the application builder.');
        }
        (0, node_assert_1.default)(result.files, 'Builder did not provide result files.');
        await (0, application_builder_1.writeTestFiles)(result.files, outputPath);
        const setupFiles = ['init-testbed.js'];
        if (buildTargetOptions?.polyfills?.length) {
            setupFiles.push('polyfills.js');
        }
        instance ??= await startVitest('test', undefined /* cliFilters */, undefined /* options */, {
            test: {
                root: outputPath,
                setupFiles,
                // Use `jsdom` if no browsers are explicitly configured.
                // `node` is effectively no "environment" and the default.
                environment: browser ? 'node' : 'jsdom',
                watch: normalizedOptions.watch,
                browser,
                coverage: {
                    enabled: normalizedOptions.codeCoverage,
                    exclude: normalizedOptions.codeCoverageExclude,
                    excludeAfterRemap: true,
                },
            },
        });
        // Check if all the tests pass to calculate the result
        const testModules = instance.state.getTestModules();
        yield { success: testModules.every((testModule) => testModule.ok()) };
    }
}
function findBrowserProvider(projectSourceRoot) {
    const projectResolver = (0, node_module_1.createRequire)(projectSourceRoot + '/').resolve;
    // These must be installed in the project to be used
    const vitestBuiltinProviders = ['playwright', 'webdriverio'];
    for (const providerName of vitestBuiltinProviders) {
        try {
            projectResolver(providerName);
            return providerName;
        }
        catch { }
    }
}
