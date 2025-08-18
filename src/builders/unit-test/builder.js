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
var __addDisposableResource = (this && this.__addDisposableResource) || function (env, value, async) {
    if (value !== null && value !== void 0) {
        if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
        var dispose, inner;
        if (async) {
            if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
            dispose = value[Symbol.asyncDispose];
        }
        if (dispose === void 0) {
            if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
            dispose = value[Symbol.dispose];
            if (async) inner = dispose;
        }
        if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
        if (inner) dispose = function() { try { inner.call(this); } catch (e) { return Promise.reject(e); } };
        env.stack.push({ value: value, dispose: dispose, async: async });
    }
    else if (async) {
        env.stack.push({ async: true });
    }
    return value;
};
var __disposeResources = (this && this.__disposeResources) || (function (SuppressedError) {
    return function (env) {
        function fail(e) {
            env.error = env.hasError ? new SuppressedError(e, env.error, "An error was suppressed during disposal.") : e;
            env.hasError = true;
        }
        var r, s = 0;
        function next() {
            while (r = env.stack.pop()) {
                try {
                    if (!r.async && s === 1) return s = 0, env.stack.push(r), Promise.resolve().then(next);
                    if (r.dispose) {
                        var result = r.dispose.call(r.value);
                        if (r.async) return s |= 2, Promise.resolve(result).then(next, function(e) { fail(e); return next(); });
                    }
                    else s |= 1;
                }
                catch (e) {
                    fail(e);
                }
            }
            if (s === 1) return env.hasError ? Promise.reject(env.error) : Promise.resolve();
            if (env.hasError) throw env.error;
        }
        return next();
    };
})(typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
});
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.execute = execute;
const node_assert_1 = __importDefault(require("node:assert"));
const virtual_module_plugin_1 = require("../../tools/esbuild/virtual-module-plugin");
const error_1 = require("../../utils/error");
const application_1 = require("../application");
const results_1 = require("../application/results");
const options_1 = require("./options");
/**
 * @experimental Direct usage of this function is considered experimental.
 */
async function* execute(options, context, extensions) {
    const env_1 = { stack: [], error: void 0, hasError: false };
    try {
        // Determine project name from builder context target
        const projectName = context.target?.project;
        if (!projectName) {
            context.logger.error(`The builder requires a target to be specified.`);
            return;
        }
        context.logger.warn(`NOTE: The "unit-test" builder is currently EXPERIMENTAL and not ready for production use.`);
        const normalizedOptions = await (0, options_1.normalizeOptions)(context, projectName, options);
        const { runnerName, projectSourceRoot } = normalizedOptions;
        // Dynamically load the requested runner
        let runner;
        try {
            const { default: runnerModule } = await Promise.resolve(`${`./runners/${runnerName}/index`}`).then(s => __importStar(require(s)));
            runner = runnerModule;
        }
        catch (e) {
            (0, error_1.assertIsError)(e);
            if (e.code !== 'ERR_MODULE_NOT_FOUND') {
                throw e;
            }
            context.logger.error(`Unknown test runner "${runnerName}".`);
            return;
        }
        // Create the stateful executor once
        const executor = __addDisposableResource(env_1, await runner.createExecutor(context, normalizedOptions), true);
        if (runner.isStandalone) {
            yield* executor.execute({
                kind: results_1.ResultKind.Full,
                files: {},
            });
            return;
        }
        // Get base build options from the buildTarget
        const buildTargetOptions = (await context.validateOptions(await context.getTargetOptions(normalizedOptions.buildTarget), await context.getBuilderNameForTarget(normalizedOptions.buildTarget)));
        // Get runner-specific build options from the hook
        const { buildOptions: runnerBuildOptions, virtualFiles } = await runner.getBuildOptions(normalizedOptions, buildTargetOptions);
        if (virtualFiles) {
            extensions ??= {};
            extensions.codePlugins ??= [];
            for (const [namespace, contents] of Object.entries(virtualFiles)) {
                extensions.codePlugins.push((0, virtual_module_plugin_1.createVirtualModulePlugin)({
                    namespace,
                    loadContent: () => {
                        return {
                            contents,
                            loader: 'js',
                            resolveDir: projectSourceRoot,
                        };
                    },
                }));
            }
        }
        const { watch, tsConfig } = normalizedOptions;
        // Prepare and run the application build
        const applicationBuildOptions = {
            // Base options
            ...buildTargetOptions,
            watch,
            tsConfig,
            // Runner specific
            ...runnerBuildOptions,
        };
        for await (const buildResult of (0, application_1.buildApplicationInternal)(applicationBuildOptions, context, extensions)) {
            if (buildResult.kind === results_1.ResultKind.Failure) {
                yield { success: false };
                continue;
            }
            else if (buildResult.kind !== results_1.ResultKind.Full &&
                buildResult.kind !== results_1.ResultKind.Incremental) {
                node_assert_1.default.fail('A full and/or incremental build result is required from the application builder.');
            }
            (0, node_assert_1.default)(buildResult.files, 'Builder did not provide result files.');
            // Pass the build artifacts to the executor
            yield* executor.execute(buildResult);
        }
    }
    catch (e_1) {
        env_1.error = e_1;
        env_1.hasError = true;
    }
    finally {
        const result_1 = __disposeResources(env_1);
        if (result_1)
            await result_1;
    }
}
