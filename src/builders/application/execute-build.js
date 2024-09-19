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
exports.executeBuild = executeBuild;
const node_assert_1 = __importDefault(require("node:assert"));
const source_file_cache_1 = require("../../tools/esbuild/angular/source-file-cache");
const budget_stats_1 = require("../../tools/esbuild/budget-stats");
const bundler_context_1 = require("../../tools/esbuild/bundler-context");
const bundler_execution_result_1 = require("../../tools/esbuild/bundler-execution-result");
const commonjs_checker_1 = require("../../tools/esbuild/commonjs-checker");
const license_extractor_1 = require("../../tools/esbuild/license-extractor");
const profiling_1 = require("../../tools/esbuild/profiling");
const utils_1 = require("../../tools/esbuild/utils");
const bundle_calculator_1 = require("../../utils/bundle-calculator");
const environment_options_1 = require("../../utils/environment-options");
const resolve_assets_1 = require("../../utils/resolve-assets");
const manifest_1 = require("../../utils/server-rendering/manifest");
const supported_browsers_1 = require("../../utils/supported-browsers");
const chunk_optimizer_1 = require("./chunk-optimizer");
const execute_post_bundle_1 = require("./execute-post-bundle");
const i18n_1 = require("./i18n");
const schema_1 = require("./schema");
const setup_bundling_1 = require("./setup-bundling");
// eslint-disable-next-line max-lines-per-function
async function executeBuild(options, context, rebuildState) {
    const { projectRoot, workspaceRoot, i18nOptions, optimizationOptions, assets, outputMode, cacheOptions, serverEntryPoint, baseHref, ssrOptions, verbose, colors, jsonLogs, } = options;
    // TODO: Consider integrating into watch mode. Would require full rebuild on target changes.
    const browsers = (0, supported_browsers_1.getSupportedBrowsers)(projectRoot, context.logger);
    // Load active translations if inlining
    // TODO: Integrate into watch mode and only load changed translations
    if (i18nOptions.shouldInline) {
        await (0, i18n_1.loadActiveTranslations)(context, i18nOptions);
    }
    // Reuse rebuild state or create new bundle contexts for code and global stylesheets
    let bundlerContexts = rebuildState?.rebuildContexts;
    const codeBundleCache = rebuildState?.codeBundleCache ??
        new source_file_cache_1.SourceFileCache(cacheOptions.enabled ? cacheOptions.path : undefined);
    if (bundlerContexts === undefined) {
        bundlerContexts = (0, setup_bundling_1.setupBundlerContexts)(options, browsers, codeBundleCache);
    }
    let bundlingResult = await bundler_context_1.BundlerContext.bundleAll(bundlerContexts, rebuildState?.fileChanges.all);
    if (options.optimizationOptions.scripts && environment_options_1.shouldOptimizeChunks) {
        bundlingResult = await (0, profiling_1.profileAsync)('OPTIMIZE_CHUNKS', () => (0, chunk_optimizer_1.optimizeChunks)(bundlingResult, options.sourcemapOptions.scripts ? !options.sourcemapOptions.hidden || 'hidden' : false));
    }
    const executionResult = new bundler_execution_result_1.ExecutionResult(bundlerContexts, codeBundleCache);
    executionResult.addWarnings(bundlingResult.warnings);
    // Return if the bundling has errors
    if (bundlingResult.errors) {
        executionResult.addErrors(bundlingResult.errors);
        return executionResult;
    }
    // Analyze external imports if external options are enabled
    if (options.externalPackages || bundlingResult.externalConfiguration) {
        const { externalConfiguration, externalImports: { browser, server }, } = bundlingResult;
        const implicitBrowser = browser ? [...browser] : [];
        const implicitServer = server ? [...server] : [];
        // TODO: Implement wildcard externalConfiguration filtering
        executionResult.setExternalMetadata(externalConfiguration
            ? implicitBrowser.filter((value) => !externalConfiguration.includes(value))
            : implicitBrowser, externalConfiguration
            ? implicitServer.filter((value) => !externalConfiguration.includes(value))
            : implicitServer, externalConfiguration);
    }
    const { metafile, initialFiles, outputFiles } = bundlingResult;
    executionResult.outputFiles.push(...outputFiles);
    const changedFiles = rebuildState && executionResult.findChangedFiles(rebuildState.previousOutputHashes);
    // Analyze files for bundle budget failures if present
    let budgetFailures;
    if (options.budgets) {
        const compatStats = (0, budget_stats_1.generateBudgetStats)(metafile, outputFiles, initialFiles);
        budgetFailures = [...(0, bundle_calculator_1.checkBudgets)(options.budgets, compatStats, true)];
        for (const { message, severity } of budgetFailures) {
            if (severity === 'error') {
                executionResult.addError(message);
            }
            else {
                executionResult.addWarning(message);
            }
        }
    }
    // Calculate estimated transfer size if scripts are optimized
    let estimatedTransferSizes;
    if (optimizationOptions.scripts || optimizationOptions.styles.minify) {
        estimatedTransferSizes = await (0, utils_1.calculateEstimatedTransferSizes)(executionResult.outputFiles);
    }
    // Check metafile for CommonJS module usage if optimizing scripts
    if (optimizationOptions.scripts) {
        const messages = (0, commonjs_checker_1.checkCommonJSModules)(metafile, options.allowedCommonJsDependencies);
        executionResult.addWarnings(messages);
    }
    // Copy assets
    if (assets) {
        executionResult.addAssets(await (0, resolve_assets_1.resolveAssets)(assets, workspaceRoot));
    }
    // Extract and write licenses for used packages
    if (options.extractLicenses) {
        executionResult.addOutputFile('3rdpartylicenses.txt', await (0, license_extractor_1.extractLicenses)(metafile, workspaceRoot), bundler_context_1.BuildOutputFileType.Root);
    }
    // Watch input index HTML file if configured
    if (options.indexHtmlOptions) {
        executionResult.extraWatchFiles.push(options.indexHtmlOptions.input);
        executionResult.htmlIndexPath = options.indexHtmlOptions.output;
        executionResult.htmlBaseHref = options.baseHref;
    }
    // Create server app engine manifest
    if (serverEntryPoint) {
        executionResult.addOutputFile(manifest_1.SERVER_APP_ENGINE_MANIFEST_FILENAME, (0, manifest_1.generateAngularServerAppEngineManifest)(i18nOptions, baseHref, undefined), bundler_context_1.BuildOutputFileType.ServerRoot);
    }
    // Perform i18n translation inlining if enabled
    if (i18nOptions.shouldInline) {
        const result = await (0, i18n_1.inlineI18n)(options, executionResult, initialFiles);
        executionResult.addErrors(result.errors);
        executionResult.addWarnings(result.warnings);
        executionResult.addPrerenderedRoutes(result.prerenderedRoutes);
    }
    else {
        const result = await (0, execute_post_bundle_1.executePostBundleSteps)(options, executionResult.outputFiles, executionResult.assetFiles, initialFiles, 
        // Set lang attribute to the defined source locale if present
        i18nOptions.hasDefinedSourceLocale ? i18nOptions.sourceLocale : undefined);
        executionResult.addErrors(result.errors);
        executionResult.addWarnings(result.warnings);
        executionResult.addPrerenderedRoutes(result.prerenderedRoutes);
        executionResult.outputFiles.push(...result.additionalOutputFiles);
        executionResult.assetFiles.push(...result.additionalAssets);
    }
    if (serverEntryPoint) {
        const prerenderedRoutes = executionResult.prerenderedRoutes;
        // Regenerate the manifest to append prerendered routes data. This is only needed if SSR is enabled.
        if (outputMode === schema_1.OutputMode.Server && Object.keys(prerenderedRoutes).length) {
            const manifest = executionResult.outputFiles.find((f) => f.path === manifest_1.SERVER_APP_ENGINE_MANIFEST_FILENAME);
            (0, node_assert_1.default)(manifest, `${manifest_1.SERVER_APP_ENGINE_MANIFEST_FILENAME} was not found in output files.`);
            manifest.contents = new TextEncoder().encode((0, manifest_1.generateAngularServerAppEngineManifest)(i18nOptions, baseHref, prerenderedRoutes));
        }
        executionResult.addOutputFile('prerendered-routes.json', JSON.stringify({ routes: prerenderedRoutes }, null, 2), bundler_context_1.BuildOutputFileType.Root);
    }
    // Write metafile if stats option is enabled
    if (options.stats) {
        executionResult.addOutputFile('stats.json', JSON.stringify(metafile, null, 2), bundler_context_1.BuildOutputFileType.Root);
    }
    if (!jsonLogs) {
        executionResult.addLog((0, utils_1.logBuildStats)(metafile, outputFiles, initialFiles, budgetFailures, colors, changedFiles, estimatedTransferSizes, !!ssrOptions, verbose));
    }
    return executionResult;
}
