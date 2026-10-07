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
exports.generatePackageManifests = generatePackageManifests;
const node_module_1 = require("node:module");
const node_path_1 = __importDefault(require("node:path"));
const utils_1 = require("./utils");
/**
 * Generates the APF package.json and secondary entry point package.json manifests.
 *
 * @param options The normalized library options.
 * @param isWatchMode Whether the builder is running in watch mode.
 * @param hasTslibImport Whether any output chunk imports 'tslib'.
 * @returns An array of memory output files containing generated package manifests and .npmignore.
 */
async function generatePackageManifests(options, isWatchMode, hasTslibImport = false) {
    const { packageJson: rawPackageJson, keepLifecycleScripts, compilationMode } = options;
    const { devDependencies: _devDependencies, scripts, name, version, exports: userExports, workspaces: _workspaces, ...restPackageJson } = rawPackageJson;
    const exportsMap = {
        ...(typeof userExports === 'object' && userExports !== null && !Array.isArray(userExports)
            ? userExports
            : {}),
        './package.json': { default: './package.json' },
    };
    const primaryEntryPoint = options.entryPoints.get('.');
    if (!primaryEntryPoint) {
        throw new Error(`Primary entry point '.' was not found in entryPoints.`);
    }
    const primaryName = primaryEntryPoint.bundleName;
    // Configure primary entry point
    const primaryFesm = `./${utils_1.FESM_OUTPUT_DIR}/${primaryName}.mjs`;
    const primaryDts = `./${utils_1.TYPES_OUTPUT_DIR}/${primaryName}.d.ts`;
    exportsMap['.'] = createExportConditions(exportsMap['.'], primaryDts, primaryFesm);
    const distPackageJson = {
        ...restPackageJson,
        name,
        type: 'module',
        sideEffects: rawPackageJson.sideEffects ?? false,
        main: primaryFesm,
        module: primaryFesm,
        typings: primaryDts,
        types: primaryDts,
        exports: exportsMap,
        // Needed because of Webpack's 5 `cachemanagedpaths`
        // https://github.com/angular/angular-cli/issues/20962
        version: isWatchMode ? `0.0.0-watch+${Date.now()}` : version,
    };
    if (hasTslibImport && !rawPackageJson.dependencies?.['tslib']) {
        const tslibVersion = await getAngularTslibRange(options.workspaceRoot);
        if (tslibVersion) {
            distPackageJson.dependencies = {
                ...rawPackageJson.dependencies,
                tslib: tslibVersion,
            };
        }
    }
    // Retain scripts if keepLifecycleScripts is set
    if (keepLifecycleScripts && scripts) {
        distPackageJson.scripts = scripts;
    }
    // Prevent accidental publishing of non-partial compilation packages (APF requirement)
    if (compilationMode !== 'partial') {
        distPackageJson.scripts = {
            ...distPackageJson.scripts,
            prepublishOnly: 'node --eval "' +
                "console.error('ERROR: Trying to publish a package that has been compiled in full compilation mode. " +
                'This is not allowed by the Angular Package Format. ' +
                "Please rebuild with compilationMode set to \\'partial\\' before publishing.'); " +
                'process.exit(1)"',
        };
    }
    // Configure secondary entry points
    const nestedPackageJsonDirs = [];
    const filesToEmit = [];
    for (const entryPoint of options.entryPoints.values()) {
        if (entryPoint.isPrimary) {
            continue;
        }
        const { subpath, name: epSubpathName, bundleName: epName } = entryPoint;
        const epFesm = `./${utils_1.FESM_OUTPUT_DIR}/${epName}.mjs`;
        const epDts = `./${utils_1.TYPES_OUTPUT_DIR}/${epName}.d.ts`;
        exportsMap[subpath] = createExportConditions(exportsMap[subpath], epDts, epFesm);
        // Emit secondary package.json for legacy resolution tools
        nestedPackageJsonDirs.push(epSubpathName);
        const relFesm = node_path_1.default.posix.relative(epSubpathName, epFesm);
        const relDts = node_path_1.default.posix.relative(epSubpathName, epDts);
        const secondaryModule = relFesm[0] === '.' ? relFesm : `./${relFesm}`;
        const secondaryTypings = relDts[0] === '.' ? relDts : `./${relDts}`;
        const secondaryPackageJson = {
            module: secondaryModule,
            typings: secondaryTypings,
            types: secondaryTypings,
        };
        filesToEmit.push((0, utils_1.createMemoryOutputFile)(node_path_1.default.posix.join(epSubpathName, 'package.json'), secondaryPackageJson));
    }
    // Write .npmignore to prevent publishing nested secondary package.json files
    if (nestedPackageJsonDirs.length > 0) {
        const entryPointsJsonPaths = nestedPackageJsonDirs.map((d) => `/${d}/package.json`);
        filesToEmit.push((0, utils_1.createMemoryOutputFile)('.npmignore', `# Nested package.json's are only needed for development.\n${entryPointsJsonPaths.join('\n')}`));
    }
    // create root package.json
    filesToEmit.push((0, utils_1.createMemoryOutputFile)('package.json', distPackageJson));
    return filesToEmit;
}
/**
 * Creates or updates export conditions for an entry point, preserving custom user-defined conditions.
 */
function createExportConditions(existingConditions, dtsPath, fesmPath) {
    const existing = typeof existingConditions === 'object' &&
        existingConditions !== null &&
        !Array.isArray(existingConditions)
        ? existingConditions
        : {};
    const { types: _types, default: _default, ...otherConditions } = existing;
    return {
        types: dtsPath,
        ...otherConditions,
        default: fesmPath,
    };
}
/**
 * Cached tslib range used by the Angular compiler.
 */
let cachedTslibRange;
/**
 * Get the tslib range used by the Angular compiler.
 * @param workspaceRoot path to the workspace root
 * @returns tslib range
 */
async function getAngularTslibRange(workspaceRoot) {
    if (cachedTslibRange) {
        return cachedTslibRange;
    }
    const workspaceRequire = (0, node_module_1.createRequire)(node_path_1.default.join(workspaceRoot, 'package.json'));
    // Try resolving via @angular/compiler dependencies
    try {
        const angularCompilerPkg = await (0, utils_1.loadPackageJson)(workspaceRequire.resolve('@angular/compiler/package.json'));
        cachedTslibRange = angularCompilerPkg.dependencies?.['tslib'];
    }
    catch { }
    // Fallback: Try resolving tslib directly
    if (!cachedTslibRange) {
        try {
            const tslibPkg = await (0, utils_1.loadPackageJson)(workspaceRequire.resolve('tslib/package.json'));
            if (tslibPkg.version) {
                cachedTslibRange = `^${tslibPkg.version}`;
            }
        }
        catch { }
    }
    // Fail fast if still unresolved
    if (!cachedTslibRange) {
        throw new Error('Unable to resolve tslib range.');
    }
    return cachedTslibRange;
}
//# sourceMappingURL=package-manifests.js.map