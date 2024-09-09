/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { NormalizedApplicationBuildOptions } from '../../builders/application/options';
import type { BuildOutputFile } from '../../tools/esbuild/bundler-context';
export declare const SERVER_APP_MANIFEST_FILENAME = "angular-app-manifest.mjs";
/**
 * Generates the server manifest for the App Engine environment.
 *
 * This manifest is used to configure the server-side rendering (SSR) setup for the
 * Angular application when deployed to Google App Engine. It includes the entry points
 * for different locales and the base HREF for the application.
 *
 * @param i18nOptions - The internationalization options for the application build. This
 * includes settings for inlining locales and determining the output structure.
 * @param baseHref - The base HREF for the application. This is used to set the base URL
 * for all relative URLs in the application.
 * @returns A string representing the content of the SSR server manifest for App Engine.
 */
export declare function generateAngularServerAppEngineManifest(i18nOptions: NormalizedApplicationBuildOptions['i18nOptions'], baseHref: string | undefined): string;
/**
 * Generates the server manifest for the standard Node.js environment.
 *
 * This manifest is used to configure the server-side rendering (SSR) setup for the
 * Angular application when running in a standard Node.js environment. It includes
 * information about the bootstrap module, whether to inline critical CSS, and any
 * additional HTML and CSS output files.
 *
 * @param additionalHtmlOutputFiles - A map of additional HTML output files generated
 * during the build process, keyed by their file paths.
 * @param outputFiles - An array of all output files from the build process, including
 * JavaScript and CSS files.
 * @param inlineCriticalCss - A boolean indicating whether critical CSS should be inlined
 * in the server-side rendered pages.
 * @param routes - An optional array of route definitions for the application, used for
 * server-side rendering and routing.
 * @returns A string representing the content of the SSR server manifest for the Node.js
 * environment.
 */
export declare function generateAngularServerAppManifest(additionalHtmlOutputFiles: Map<string, BuildOutputFile>, outputFiles: BuildOutputFile[], inlineCriticalCss: boolean, routes: readonly unknown[] | undefined): string;