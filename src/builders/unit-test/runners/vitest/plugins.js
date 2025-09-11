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
exports.createVitestPlugins = createVitestPlugins;
const node_assert_1 = __importDefault(require("node:assert"));
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const path_1 = require("../../../../utils/path");
function createVitestPlugins(options, testSetupFiles, browserOptions, pluginOptions) {
    const { workspaceRoot, projectName, buildResultFiles, testFileToEntryPoint } = pluginOptions;
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
                        name: projectName,
                        root: workspaceRoot,
                        globals: true,
                        setupFiles: testSetupFiles,
                        // Use `jsdom` if no browsers are explicitly configured.
                        // `node` is effectively no "environment" and the default.
                        environment: browserOptions.browser ? 'node' : 'jsdom',
                        browser: browserOptions.browser,
                        include: options.include,
                        ...(options.exclude ? { exclude: options.exclude } : {}),
                    },
                    plugins: [
                        {
                            name: 'angular:test-in-memory-provider',
                            enforce: 'pre',
                            resolveId: (id, importer) => {
                                if (importer && (id[0] === '.' || id[0] === '/')) {
                                    let fullPath;
                                    if (testFileToEntryPoint.has(importer)) {
                                        fullPath = (0, path_1.toPosixPath)(node_path_1.default.join(workspaceRoot, id));
                                    }
                                    else {
                                        fullPath = (0, path_1.toPosixPath)(node_path_1.default.join(node_path_1.default.dirname(importer), id));
                                    }
                                    const relativePath = node_path_1.default.relative(workspaceRoot, fullPath);
                                    if (buildResultFiles.has((0, path_1.toPosixPath)(relativePath))) {
                                        return fullPath;
                                    }
                                }
                                if (testFileToEntryPoint.has(id)) {
                                    return id;
                                }
                                (0, node_assert_1.default)(buildResultFiles.size > 0, 'buildResult must be available for resolving.');
                                const relativePath = node_path_1.default.relative(workspaceRoot, id);
                                if (buildResultFiles.has((0, path_1.toPosixPath)(relativePath))) {
                                    return id;
                                }
                            },
                            load: async (id) => {
                                (0, node_assert_1.default)(buildResultFiles.size > 0, 'buildResult must be available for in-memory loading.');
                                // Attempt to load as a source test file.
                                const entryPoint = testFileToEntryPoint.get(id);
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
                                    const relativePath = node_path_1.default.relative(workspaceRoot, id);
                                    outputPath = (0, path_1.toPosixPath)(relativePath);
                                }
                                const outputFile = buildResultFiles.get(outputPath);
                                if (outputFile) {
                                    const sourceMapPath = outputPath + '.map';
                                    const sourceMapFile = buildResultFiles.get(sourceMapPath);
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
                                if (buildResultFiles.has('styles.css')) {
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
