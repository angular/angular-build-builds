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
exports.getVitestBuildOptions = getVitestBuildOptions;
const node_path_1 = __importDefault(require("node:path"));
const path_1 = require("../../../../utils/path");
const schema_1 = require("../../../application/schema");
const options_1 = require("../../options");
const test_discovery_1 = require("../../test-discovery");
/**
 * A list of Angular related packages that should be marked as external.
 * This allows Vite to pre-bundle them, improving performance.
 */
const ANGULAR_PACKAGES_TO_EXTERNALIZE = [
    '@angular/core',
    '@angular/common',
    '@angular/platform-browser',
    '@angular/compiler',
    '@angular/router',
    '@angular/forms',
    '@angular/animations',
    'rxjs',
];
function createTestBedInitVirtualFile(providersFile, projectSourceRoot, polyfills = []) {
    const usesZoneJS = polyfills.includes('zone.js');
    let providersImport = 'const providers = [];';
    if (providersFile) {
        const relativePath = node_path_1.default.relative(projectSourceRoot, providersFile);
        const { dir, name } = node_path_1.default.parse(relativePath);
        const importPath = (0, path_1.toPosixPath)(node_path_1.default.join(dir, name));
        providersImport = `import providers from './${importPath}';`;
    }
    return `
    // Initialize the Angular testing environment
    import { NgModule${usesZoneJS ? ', provideZoneChangeDetection' : ''} } from '@angular/core';
    import { getTestBed, ɵgetCleanupHook as getCleanupHook } from '@angular/core/testing';
    import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
    ${providersImport}
    // Same as https://github.com/angular/angular/blob/05a03d3f975771bb59c7eefd37c01fa127ee2229/packages/core/testing/srcs/test_hooks.ts#L21-L29
    beforeEach(getCleanupHook(false));
    afterEach(getCleanupHook(true));
    @NgModule({
      providers: [${usesZoneJS ? 'provideZoneChangeDetection(), ' : ''}...providers],
    })
    export class TestModule {}
    getTestBed().initTestEnvironment([BrowserTestingModule, TestModule], platformBrowserTesting(), {
      errorOnUnknownElements: true,
      errorOnUnknownProperties: true,
    });
  `;
}
function adjustOutputHashing(hashing) {
    switch (hashing) {
        case schema_1.OutputHashing.All:
        case schema_1.OutputHashing.Media:
            // Ensure media is continued to be hashed to avoid overwriting of output media files
            return schema_1.OutputHashing.Media;
        default:
            return schema_1.OutputHashing.None;
    }
}
async function getVitestBuildOptions(options, baseBuildOptions) {
    const { workspaceRoot, projectSourceRoot, include, exclude = [], watch, providersFile } = options;
    // Find test files
    const testFiles = await (0, test_discovery_1.findTests)(include, exclude, workspaceRoot, projectSourceRoot);
    if (testFiles.length === 0) {
        throw new Error('No tests found matching the following patterns:\n' +
            `- Included: ${include.join(', ')}\n` +
            (exclude.length ? `- Excluded: ${exclude.join(', ')}\n` : '') +
            `\nPlease check the 'test' target configuration in your project's 'angular.json' file.`);
    }
    const entryPoints = (0, test_discovery_1.getTestEntrypoints)(testFiles, {
        projectSourceRoot,
        workspaceRoot,
        removeTestExtension: true,
    });
    entryPoints.set('init-testbed', 'angular:test-bed-init');
    const externalDependencies = new Set(['vitest']);
    if (!options.browsers?.length) {
        // Only add for non-browser setups.
        // Comprehensive browser prebundling will be handled separately.
        ANGULAR_PACKAGES_TO_EXTERNALIZE.forEach((dep) => externalDependencies.add(dep));
    }
    if (baseBuildOptions.externalDependencies) {
        baseBuildOptions.externalDependencies.forEach((dep) => externalDependencies.add(dep));
    }
    const buildOptions = {
        ...baseBuildOptions,
        watch,
        incrementalResults: watch,
        index: false,
        browser: undefined,
        server: undefined,
        outputMode: undefined,
        localize: false,
        budgets: [],
        serviceWorker: false,
        appShell: false,
        ssr: false,
        prerender: false,
        sourceMap: { scripts: true, vendor: false, styles: false },
        outputHashing: adjustOutputHashing(baseBuildOptions.outputHashing),
        optimization: false,
        entryPoints,
        externalDependencies: [...externalDependencies],
    };
    buildOptions.polyfills = (0, options_1.injectTestingPolyfills)(buildOptions.polyfills);
    const testBedInitContents = createTestBedInitVirtualFile(providersFile, projectSourceRoot, buildOptions.polyfills);
    return {
        buildOptions,
        virtualFiles: {
            'angular:test-bed-init': testBedInitContents,
        },
        testEntryPointMappings: entryPoints,
    };
}
//# sourceMappingURL=build-options.js.map