/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import type { VitestPlugin } from 'vitest/node';
import type { ResultFile } from '../../../application/results';
import type { NormalizedUnitTestBuilderOptions } from '../../options';
import type { BrowserConfiguration } from './browser-provider';
type VitestPlugins = Awaited<ReturnType<typeof VitestPlugin>>;
interface PluginOptions {
    workspaceRoot: string;
    projectSourceRoot: string;
    projectName: string;
    include?: string[];
    exclude?: string[];
    buildResultFiles: ReadonlyMap<string, ResultFile>;
    testFileToEntryPoint: ReadonlyMap<string, string>;
}
export declare function createVitestPlugins(options: NormalizedUnitTestBuilderOptions, testSetupFiles: string[], browserOptions: BrowserConfiguration, pluginOptions: PluginOptions): VitestPlugins;
export {};
