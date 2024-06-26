/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { BuilderContext } from '@angular-devkit/architect';
/** Delete stale cache directories used by previous versions of build-angular. */
export declare function purgeStaleBuildCache(context: BuilderContext): Promise<void>;
