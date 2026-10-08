'use strict';

/**
 * Loads the Next.js app's server-side TypeScript modules
 * (react-version/lib/**.ts) from these plain-Node root scripts, with no
 * build step and no extra dependency:
 *
 *   - Node (>= 22.18 / 23.6) strips TypeScript types natively, so a .ts
 *     file can be require()d directly. The app's server modules are written
 *     to allow that: ES module syntax, only erasable type syntax, and type
 *     imports marked `import type` (erased, so the `@/` alias in them is
 *     never resolved at runtime).
 *   - The app imports its own modules extension-less ('./apifyClient',
 *     '../db/mattressRepo') because the Next bundler resolves them. Plain
 *     Node ESM does not, so a tiny synchronous resolve hook retries a
 *     failed relative (or '@/') specifier inside react-version/ with '.ts'.
 *
 * Usage: const { runRtingsSync } = requireAppModule('lib/apify/rtingsSync');
 */
const path = require('path');
const { pathToFileURL } = require('url');
const nodeModule = require('module');

const APP_ROOT = path.join(__dirname, '..', '..', 'react-version');
const APP_ROOT_URL = pathToFileURL(APP_ROOT + path.sep).href;

let hooksRegistered = false;

function registerAppResolveHook() {
  if (hooksRegistered) return;
  if (typeof nodeModule.registerHooks !== 'function') {
    throw new Error(`Loading react-version/lib TypeScript modules needs Node >= 22.18 (module.registerHooks + type stripping); this is ${process.version}.`);
  }
  nodeModule.registerHooks({
    resolve(specifier, context, nextResolve) {
      let resolved;
      try {
        resolved = nextResolve(specifier, context);
      } catch (error) {
        const fromApp = typeof context.parentURL === 'string' && context.parentURL.startsWith(APP_ROOT_URL);
        if (!fromApp || error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
        if (specifier.startsWith('@/')) {
          resolved = nextResolve(pathToFileURL(path.join(APP_ROOT, `${specifier.slice(2)}.ts`)).href, context);
        } else if (specifier.startsWith('./') || specifier.startsWith('../')) {
          resolved = nextResolve(`${specifier}.ts`, context);
        } else {
          throw error;
        }
      }
      // The app's .ts modules are ES modules; saying so up front avoids
      // Node's "typeless package.json, reparsing as ESM" detection warning.
      if (resolved.url.startsWith(APP_ROOT_URL) && resolved.url.endsWith('.ts') && !resolved.url.includes('/node_modules/')) {
        return { ...resolved, format: 'module-typescript' };
      }
      return resolved;
    },
  });
  hooksRegistered = true;
}

/**
 * require() a react-version module by its path relative to react-version/,
 * without extension (e.g. 'lib/db/mattressRepo').
 */
function requireAppModule(relativePath) {
  registerAppResolveHook();
  return require(path.join(APP_ROOT, `${relativePath}.ts`));
}

module.exports = { requireAppModule, APP_ROOT };
