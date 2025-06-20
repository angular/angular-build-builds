"use strict";
// THIS FILE IS AUTOMATICALLY GENERATED. TO UPDATE THIS FILE YOU NEED TO CHANGE THE
// CORRESPONDING JSON SCHEMA FILE, THEN RUN devkit-admin build (or bazel build ...).
Object.defineProperty(exports, "__esModule", { value: true });
exports.Runner = exports.CoverageReporters = void 0;
var CoverageReporters;
(function (CoverageReporters) {
    CoverageReporters["Cobertura"] = "cobertura";
    CoverageReporters["Html"] = "html";
    CoverageReporters["Json"] = "json";
    CoverageReporters["JsonSummary"] = "json-summary";
    CoverageReporters["Lcov"] = "lcov";
    CoverageReporters["Lcovonly"] = "lcovonly";
    CoverageReporters["Text"] = "text";
    CoverageReporters["TextSummary"] = "text-summary";
})(CoverageReporters || (exports.CoverageReporters = CoverageReporters = {}));
/**
 * The name of the test runner to use for test execution.
 */
var Runner;
(function (Runner) {
    Runner["Karma"] = "karma";
    Runner["Vitest"] = "vitest";
})(Runner || (exports.Runner = Runner = {}));
