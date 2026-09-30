"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEntryPointBundleName = getEntryPointBundleName;
/**
 * Computes the base bundle file name for an entry point.
 *
 * @param packageName The package name from package.json.
 * @param entryPointName The entry point subpath name (defaults to '.').
 * @returns The sanitized bundle base name.
 */
function getEntryPointBundleName(packageName, entryPointName = '.') {
    const isPrimary = !entryPointName || entryPointName === '.';
    const pkgName = packageName[0] === '@' ? packageName.slice(1) : packageName;
    const epName = isPrimary ? pkgName : `${pkgName}-${entryPointName}`;
    return epName.replaceAll('/', '-');
}
//# sourceMappingURL=entry-points.js.map