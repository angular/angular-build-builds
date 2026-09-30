/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import type { BuilderContext } from '@angular-devkit/architect';
import type { StylesheetPluginsass } from '../../tools/esbuild/stylesheets/stylesheet-plugin-factory';
import { normalizeAssetPatterns } from '../../utils';
import { normalizeCacheOptions } from '../../utils/normalize-cache';
import { type PostcssConfiguration } from '../../utils/postcss-configuration';
import { type NormalizedEntryPoint } from './pipeline/entry-points';
import type { Schema as LibraryBuilderOptions } from './schema';
export type { NormalizedEntryPoint } from './pipeline/entry-points';
export interface PackageJsonData {
    name: string;
    version?: string;
    type?: string;
    main?: string;
    module?: string;
    typings?: string;
    types?: string;
    sideEffects?: boolean | string[];
    exports?: string | Record<string, unknown>;
    scripts?: Record<string, string>;
    workspaces?: unknown;
    dependencies?: Record<string, string>;
    optionalDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    peerDependenciesMeta?: Record<string, {
        optional?: boolean;
    }>;
    [key: string]: unknown;
}
export interface NormalizedLibraryOptions {
    workspaceRoot: string;
    projectRoot: string;
    packageName: string;
    packageJson: PackageJsonData;
    outputPath: string;
    deleteOutputPath: boolean;
    packageJsonPath: string;
    tsConfigPath: string;
    entryPoints: Map<string, NormalizedEntryPoint>;
    inlineStyleLanguage: 'css' | 'less' | 'sass' | 'scss';
    styleIncludePaths: string[];
    sass?: StylesheetPluginsass;
    assets: ReturnType<typeof normalizeAssetPatterns>;
    compilationMode: 'partial' | 'full';
    declarationMap: boolean;
    allowedNonPeerDependencies: RegExp[];
    keepLifecycleScripts: boolean;
    watch: boolean;
    poll?: number;
    preserveSymlinks: boolean;
    progress: boolean;
    clearScreen?: boolean;
    cacheOptions: ReturnType<typeof normalizeCacheOptions>;
    postcssConfiguration?: {
        config: PostcssConfiguration;
        configPath: string;
    };
    tailwindConfiguration?: {
        file: string;
        package: string;
    };
    colors: boolean;
}
export declare function normalizeLibraryOptions(context: BuilderContext, projectName: string, options: LibraryBuilderOptions): Promise<NormalizedLibraryOptions>;
