"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuildOutputFileType = exports.buildApplication = void 0;
var application_1 = require("./builders/application");
Object.defineProperty(exports, "buildApplication", { enumerable: true, get: function () { return application_1.buildApplication; } });
var bundler_context_1 = require("./tools/esbuild/bundler-context");
Object.defineProperty(exports, "BuildOutputFileType", { enumerable: true, get: function () { return bundler_context_1.BuildOutputFileType; } });
