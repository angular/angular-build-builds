"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTestEntrypoints = exports.findTests = void 0;
// TODO: This should eventually contain the implementations for these
var find_tests_1 = require("../karma/find-tests");
Object.defineProperty(exports, "findTests", { enumerable: true, get: function () { return find_tests_1.findTests; } });
Object.defineProperty(exports, "getTestEntrypoints", { enumerable: true, get: function () { return find_tests_1.getTestEntrypoints; } });
