"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOCALE_DATA_BASE_MODULE = exports.LOCALE_DATA_NAMESPACE = void 0;
exports.createAngularLocaleDataPlugin = createAngularLocaleDataPlugin;
/**
 * The internal namespace used by generated locale import statements and Angular locale data plugin.
 */
exports.LOCALE_DATA_NAMESPACE = 'angular:locale/data';
/**
 * The base module location used to search for locale specific data.
 */
exports.LOCALE_DATA_BASE_MODULE = '@angular/common/locales/global';
/**
 * Creates an esbuild plugin that resolves Angular locale data files from `@angular/common`.
 *
 * @returns An esbuild plugin.
 */
function createAngularLocaleDataPlugin() {
    return {
        name: 'angular-locale-data',
        setup(build) {
            // If packages are configured to be external then leave the original angular locale import path.
            // This happens when using the development server with caching enabled to allow Vite prebundling to work.
            // There currently is no option on the esbuild resolve function to resolve while disabling the option. To
            // workaround the inability to resolve the full locale location here, the Vite dev server prebundling also
            // contains a plugin to allow the locales to be correctly resolved when prebundling.
            // NOTE: If esbuild eventually allows controlling the external package options in a build.resolve call, this
            //       workaround can be removed.
            if (build.initialOptions.packages === 'external') {
                return;
            }
            build.onResolve({ filter: /^angular:locale\/data:/ }, async ({ path }) => {
                // Extract the locale from the path
                const rawLocaleTag = path.split(':', 3)[2];
                // Extract and normalize the base name of the raw locale tag
                let partialLocaleTag;
                try {
                    const locale = new Intl.Locale(rawLocaleTag);
                    partialLocaleTag = locale.baseName;
                }
                catch {
                    return {
                        path: rawLocaleTag,
                        namespace: exports.LOCALE_DATA_NAMESPACE,
                        errors: [
                            {
                                text: `Invalid or unsupported locale provided in configuration: "${rawLocaleTag}"`,
                            },
                        ],
                    };
                }
                let exact = true;
                while (partialLocaleTag) {
                    // Angular embeds the `en`/`en-US` locale into the framework and it does not need to be included again here.
                    // The onLoad hook below for the locale data namespace has an `empty` loader that will prevent inclusion.
                    // Angular does not contain exact locale data for `en-US` but `en` is equivalent.
                    if (partialLocaleTag === 'en' || partialLocaleTag === 'en-US') {
                        return {
                            path: rawLocaleTag,
                            namespace: exports.LOCALE_DATA_NAMESPACE,
                        };
                    }
                    // Attempt to resolve the locale tag data within the Angular base module location
                    const potentialPath = `${exports.LOCALE_DATA_BASE_MODULE}/${partialLocaleTag}`;
                    const result = await build.resolve(potentialPath, {
                        kind: 'import-statement',
                        resolveDir: build.initialOptions.absWorkingDir,
                    });
                    if (result.path) {
                        if (exact) {
                            return result;
                        }
                        else {
                            return {
                                ...result,
                                warnings: [
                                    ...result.warnings,
                                    {
                                        location: null,
                                        text: `Locale data for '${rawLocaleTag}' cannot be found. Using locale data for '${partialLocaleTag}'.`,
                                    },
                                ],
                            };
                        }
                    }
                    // Remove the last subtag and try again with a less specific locale.
                    // Usually the match is exact so the string splitting here is not done until actually needed after the exact
                    // match fails to resolve.
                    const parts = partialLocaleTag.split('-');
                    partialLocaleTag = parts.slice(0, -1).join('-');
                    exact = false;
                }
                // Not found so issue a warning and use an empty loader. Framework built-in `en-US` data will be used.
                // This retains existing behavior as in the Webpack-based builder.
                return {
                    path: rawLocaleTag,
                    namespace: exports.LOCALE_DATA_NAMESPACE,
                    warnings: [
                        {
                            location: null,
                            text: `Locale data for '${rawLocaleTag}' cannot be found. No locale data will be included for this locale.`,
                        },
                    ],
                };
            });
            // Locales that cannot be found will be loaded as empty content with a warning from the resolve step
            build.onLoad({ filter: /./, namespace: exports.LOCALE_DATA_NAMESPACE }, () => ({
                contents: '',
                loader: 'empty',
            }));
        },
    };
}
