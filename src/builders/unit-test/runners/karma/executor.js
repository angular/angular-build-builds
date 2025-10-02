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
Object.defineProperty(exports, "__esModule", { value: true });
exports.KarmaExecutor = void 0;
class KarmaExecutor {
    context;
    options;
    constructor(context, options) {
        this.context = context;
        this.options = options;
    }
    async *execute() {
        const { context, options: unitTestOptions } = this;
        if (unitTestOptions.debug) {
            context.logger.warn('The "karma" test runner does not support the "debug" option. The option will be ignored.');
        }
        if (unitTestOptions.setupFiles.length) {
            context.logger.warn('The "karma" test runner does not support the "setupFiles" option. The option will be ignored.');
        }
        if (unitTestOptions.coverage?.all) {
            context.logger.warn('The "karma" test runner does not support the "coverageAll" option. The option will be ignored.');
        }
        if (unitTestOptions.coverage?.include) {
            context.logger.warn('The "karma" test runner does not support the "coverageInclude" option. The option will be ignored.');
        }
        const buildTargetOptions = (await context.validateOptions(await context.getTargetOptions(unitTestOptions.buildTarget), await context.getBuilderNameForTarget(unitTestOptions.buildTarget)));
        const karmaOptions = {
            tsConfig: unitTestOptions.tsConfig ?? buildTargetOptions.tsConfig,
            polyfills: buildTargetOptions.polyfills,
            assets: buildTargetOptions.assets,
            scripts: buildTargetOptions.scripts,
            styles: buildTargetOptions.styles,
            inlineStyleLanguage: buildTargetOptions.inlineStyleLanguage,
            stylePreprocessorOptions: buildTargetOptions.stylePreprocessorOptions,
            externalDependencies: buildTargetOptions.externalDependencies,
            loader: buildTargetOptions.loader,
            define: buildTargetOptions.define,
            include: unitTestOptions.include,
            exclude: unitTestOptions.exclude,
            sourceMap: buildTargetOptions.sourceMap,
            progress: unitTestOptions.buildProgress ?? buildTargetOptions.progress,
            watch: unitTestOptions.watch,
            poll: buildTargetOptions.poll,
            preserveSymlinks: buildTargetOptions.preserveSymlinks,
            browsers: unitTestOptions.browsers?.join(','),
            codeCoverage: !!unitTestOptions.coverage,
            codeCoverageExclude: unitTestOptions.coverage?.exclude,
            fileReplacements: buildTargetOptions.fileReplacements,
            reporters: unitTestOptions.reporters?.map((reporter) => {
                // Karma only supports string reporters.
                if (Object.keys(reporter[1]).length > 0) {
                    context.logger.warn(`The "karma" test runner does not support options for the "${reporter[0]}" reporter. The options will be ignored.`);
                }
                return reporter[0];
            }),
            webWorkerTsConfig: buildTargetOptions.webWorkerTsConfig,
            aot: buildTargetOptions.aot,
        };
        const transformOptions = {
            karmaOptions: (options) => {
                if (unitTestOptions.filter) {
                    let filter = unitTestOptions.filter;
                    if (filter[0] === '/' && filter.at(-1) === '/') {
                        this.context.logger.warn('The `--filter` option is always a regular expression.' +
                            'Leading and trailing `/` are not required and will be ignored.');
                    }
                    else {
                        filter = `/${filter}/`;
                    }
                    options.client ??= {};
                    options.client.args ??= [];
                    options.client.args.push('--grep', filter);
                }
                // Add coverage options
                if (unitTestOptions.coverage) {
                    const { thresholds, watermarks } = unitTestOptions.coverage;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const coverageReporter = (options.coverageReporter ??= {});
                    if (thresholds) {
                        coverageReporter.check = thresholds.perFile
                            ? { each: thresholds }
                            : { global: thresholds };
                    }
                    if (watermarks) {
                        coverageReporter.watermarks = watermarks;
                    }
                }
                return options;
            },
        };
        const { execute } = await Promise.resolve().then(() => __importStar(require('../../../karma')));
        yield* execute(karmaOptions, context, transformOptions);
    }
    async [Symbol.asyncDispose]() {
        // The Karma builder handles its own teardown
    }
}
exports.KarmaExecutor = KarmaExecutor;
