/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
export declare function setupBrowserConfiguration(browsers: string[] | undefined, debug: boolean, projectSourceRoot: string): {
    browser?: import('vitest/node').BrowserConfigOptions;
    errors?: string[];
};
