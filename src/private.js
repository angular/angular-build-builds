"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderPage = exports.isZonelessApp = exports.getFeatureSupport = exports.JavaScriptTransformer = exports.createRxjsEsmResolutionPlugin = exports.assertCompatibleAngularVersion = exports.getSupportedBrowsers = exports.generateBuildStatsTable = exports.augmentAppWithServiceWorker = exports.purgeStaleBuildCache = exports.createTranslationLoader = exports.InlineCriticalCssProcessor = exports.IndexHtmlGenerator = exports.loadTranslations = exports.createI18nOptions = exports.deleteOutputDir = exports.SassWorkerImplementation = exports.transformSupportedBrowsersToTargets = exports.emitFilesToDisk = exports.buildApplicationInternal = void 0;
/**
 * @fileoverview
 * Private exports intended only for use with the @angular-devkit/build-angular package.
 * All exports are not supported for external use, do not provide SemVer guarantees, and
 * their existence may change in any future version.
 */
// Builders
var application_1 = require("./builders/application");
Object.defineProperty(exports, "buildApplicationInternal", { enumerable: true, get: function () { return application_1.buildApplicationInternal; } });
// Tools
__exportStar(require("./tools/babel/plugins"), exports);
var utils_1 = require("./tools/esbuild/utils");
Object.defineProperty(exports, "emitFilesToDisk", { enumerable: true, get: function () { return utils_1.emitFilesToDisk; } });
var utils_2 = require("./tools/esbuild/utils");
Object.defineProperty(exports, "transformSupportedBrowsersToTargets", { enumerable: true, get: function () { return utils_2.transformSupportedBrowsersToTargets; } });
var sass_service_1 = require("./tools/sass/sass-service");
Object.defineProperty(exports, "SassWorkerImplementation", { enumerable: true, get: function () { return sass_service_1.SassWorkerImplementation; } });
// Utilities
__exportStar(require("./utils/bundle-calculator"), exports);
var delete_output_dir_1 = require("./utils/delete-output-dir");
Object.defineProperty(exports, "deleteOutputDir", { enumerable: true, get: function () { return delete_output_dir_1.deleteOutputDir; } });
var i18n_options_1 = require("./utils/i18n-options");
Object.defineProperty(exports, "createI18nOptions", { enumerable: true, get: function () { return i18n_options_1.createI18nOptions; } });
Object.defineProperty(exports, "loadTranslations", { enumerable: true, get: function () { return i18n_options_1.loadTranslations; } });
var index_html_generator_1 = require("./utils/index-file/index-html-generator");
Object.defineProperty(exports, "IndexHtmlGenerator", { enumerable: true, get: function () { return index_html_generator_1.IndexHtmlGenerator; } });
var inline_critical_css_1 = require("./utils/index-file/inline-critical-css");
Object.defineProperty(exports, "InlineCriticalCssProcessor", { enumerable: true, get: function () { return inline_critical_css_1.InlineCriticalCssProcessor; } });
var load_translations_1 = require("./utils/load-translations");
Object.defineProperty(exports, "createTranslationLoader", { enumerable: true, get: function () { return load_translations_1.createTranslationLoader; } });
var purge_cache_1 = require("./utils/purge-cache");
Object.defineProperty(exports, "purgeStaleBuildCache", { enumerable: true, get: function () { return purge_cache_1.purgeStaleBuildCache; } });
var service_worker_1 = require("./utils/service-worker");
Object.defineProperty(exports, "augmentAppWithServiceWorker", { enumerable: true, get: function () { return service_worker_1.augmentAppWithServiceWorker; } });
var stats_table_1 = require("./utils/stats-table");
Object.defineProperty(exports, "generateBuildStatsTable", { enumerable: true, get: function () { return stats_table_1.generateBuildStatsTable; } });
var supported_browsers_1 = require("./utils/supported-browsers");
Object.defineProperty(exports, "getSupportedBrowsers", { enumerable: true, get: function () { return supported_browsers_1.getSupportedBrowsers; } });
var version_1 = require("./utils/version");
Object.defineProperty(exports, "assertCompatibleAngularVersion", { enumerable: true, get: function () { return version_1.assertCompatibleAngularVersion; } });
// Required for Vite-based dev server only
var rxjs_esm_resolution_plugin_1 = require("./tools/esbuild/rxjs-esm-resolution-plugin");
Object.defineProperty(exports, "createRxjsEsmResolutionPlugin", { enumerable: true, get: function () { return rxjs_esm_resolution_plugin_1.createRxjsEsmResolutionPlugin; } });
var javascript_transformer_1 = require("./tools/esbuild/javascript-transformer");
Object.defineProperty(exports, "JavaScriptTransformer", { enumerable: true, get: function () { return javascript_transformer_1.JavaScriptTransformer; } });
var utils_3 = require("./tools/esbuild/utils");
Object.defineProperty(exports, "getFeatureSupport", { enumerable: true, get: function () { return utils_3.getFeatureSupport; } });
Object.defineProperty(exports, "isZonelessApp", { enumerable: true, get: function () { return utils_3.isZonelessApp; } });
var render_page_1 = require("./utils/server-rendering/render-page");
Object.defineProperty(exports, "renderPage", { enumerable: true, get: function () { return render_page_1.renderPage; } });
