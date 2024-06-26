"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertCompatibleAngularVersion = assertCompatibleAngularVersion;
/* eslint-disable no-console */
const node_module_1 = require("node:module");
const semver_1 = require("semver");
function assertCompatibleAngularVersion(projectRoot) {
    let angularCliPkgJson;
    let angularPkgJson;
    // Create a custom require function for ESM compliance.
    // NOTE: The trailing slash is significant.
    const projectRequire = (0, node_module_1.createRequire)(projectRoot + '/');
    try {
        const angularPackagePath = projectRequire.resolve('@angular/core/package.json');
        angularPkgJson = projectRequire(angularPackagePath);
    }
    catch {
        console.error('You seem to not be depending on "@angular/core". This is an error.');
        process.exit(2);
    }
    if (!(angularPkgJson && angularPkgJson['version'])) {
        console.error('Cannot determine versions of "@angular/core".\n' +
            'This likely means your local installation is broken. Please reinstall your packages.');
        process.exit(2);
    }
    try {
        const angularCliPkgPath = projectRequire.resolve('@angular/cli/package.json');
        angularCliPkgJson = projectRequire(angularCliPkgPath);
        if (!(angularCliPkgJson && angularCliPkgJson['version'])) {
            return;
        }
    }
    catch {
        // Not using @angular-devkit/build-angular with @angular/cli is ok too.
        // In this case we don't provide as many version checks.
        return;
    }
    if (angularCliPkgJson['version'] === '0.0.0' || angularPkgJson['version'] === '0.0.0') {
        // Internal CLI testing version or integration testing in the angular/angular
        // repository with the generated development @angular/core npm package which is versioned "0.0.0".
        return;
    }
    let supportedAngularSemver;
    try {
        supportedAngularSemver = projectRequire('@angular/build/package.json')['peerDependencies']['@angular/compiler-cli'];
    }
    catch {
        supportedAngularSemver = projectRequire('@angular-devkit/build-angular/package.json')['peerDependencies']['@angular/compiler-cli'];
    }
    const angularVersion = new semver_1.SemVer(angularPkgJson['version']);
    if (!(0, semver_1.satisfies)(angularVersion, supportedAngularSemver, { includePrerelease: true })) {
        console.error(`This version of CLI is only compatible with Angular versions ${supportedAngularSemver},\n` +
            `but Angular version ${angularVersion} was found instead.\n` +
            'Please visit the link below to find instructions on how to update Angular.\nhttps://update.angular.dev/');
        process.exit(3);
    }
}
