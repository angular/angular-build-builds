/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import type { BuildOptions } from 'esbuild';
import type { NormalizedApplicationBuildOptions } from '../../builders/application/options';
import { SourceFileCache } from './angular/source-file-cache';
import { BundlerOptionsFactory } from './bundler-context';
export declare function createBrowserCodeBundleOptions(options: NormalizedApplicationBuildOptions, target: string[], sourceFileCache?: SourceFileCache): BuildOptions;
export declare function createBrowserPolyfillBundleOptions(options: NormalizedApplicationBuildOptions, target: string[], sourceFileCache?: SourceFileCache): BuildOptions | BundlerOptionsFactory | undefined;
export declare function createServerPolyfillBundleOptions(options: NormalizedApplicationBuildOptions, target: string[], sourceFileCache?: SourceFileCache): BundlerOptionsFactory | undefined;
export declare function createServerMainCodeBundleOptions(options: NormalizedApplicationBuildOptions, target: string[], sourceFileCache: SourceFileCache): BuildOptions;
export declare function createSsrEntryCodeBundleOptions(options: NormalizedApplicationBuildOptions, target: string[], sourceFileCache: SourceFileCache): BuildOptions;
