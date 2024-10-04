/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import type { Plugin } from 'vite';
import { AngularMemoryOutputFiles } from '../utils';
interface AngularMemoryPluginOptions {
    virtualProjectRoot: string;
    outputFiles: AngularMemoryOutputFiles;
    external?: string[];
}
export declare function createAngularMemoryPlugin(options: AngularMemoryPluginOptions): Promise<Plugin>;
export {};