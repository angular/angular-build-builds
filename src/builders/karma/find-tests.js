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
// This file is a compatibility layer that re-exports the test discovery logic from its new location.
// This is necessary to avoid breaking the Karma builder, which still depends on this file.
var test_discovery_1 = require("../unit-test/test-discovery");
Object.defineProperty(exports, "findTests", { enumerable: true, get: function () { return test_discovery_1.findTests; } });
Object.defineProperty(exports, "getTestEntrypoints", { enumerable: true, get: function () { return test_discovery_1.getTestEntrypoints; } });
//# sourceMappingURL=find-tests.js.map