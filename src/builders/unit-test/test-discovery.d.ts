/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
/**
 * Finds all test files in the project.
 *
 * @param include Glob patterns of files to include.
 * @param exclude Glob patterns of files to exclude.
 * @param workspaceRoot The absolute path to the workspace root.
 * @param projectSourceRoot The absolute path to the project's source root.
 * @returns A unique set of absolute paths to all test files.
 */
export declare function findTests(include: string[], exclude: string[], workspaceRoot: string, projectSourceRoot: string): Promise<string[]>;
interface TestEntrypointsOptions {
    projectSourceRoot: string;
    workspaceRoot: string;
    removeTestExtension?: boolean;
}
/**
 * Generates unique, dash-delimited bundle names for a set of test files.
 * This is used to create distinct output files for each test.
 *
 * @param testFiles An array of absolute paths to test files.
 * @param options Configuration options for generating entry points.
 * @returns A map where keys are the generated unique bundle names and values are the original file paths.
 */
export declare function getTestEntrypoints(testFiles: string[], { projectSourceRoot, workspaceRoot, removeTestExtension }: TestEntrypointsOptions): Map<string, string>;
export {};
