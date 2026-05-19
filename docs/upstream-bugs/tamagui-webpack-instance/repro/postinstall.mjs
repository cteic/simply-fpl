import { readFileSync, writeFileSync } from 'node:fs';

const loaderPath = './node_modules/tamagui-loader/dist/esm/loader.mjs';
const src = readFileSync(loaderPath, 'utf8');

if (src.includes('requireResolve("./css.mjs")')) {
  console.log('[repro] tamagui-loader already has css.mjs fallback');
  process.exit(0);
}

const before = 'CSS_LOADER_PATH = requireResolve("./css.js");';
const after = [
  'try {',
  '      CSS_LOADER_PATH = requireResolve("./css.js");',
  '    } catch {',
  '      CSS_LOADER_PATH = requireResolve("./css.mjs");',
  '    }',
].join('\n');

if (!src.includes(before)) {
  console.error('[repro] could not locate css.js requireResolve in loader.mjs');
  process.exit(1);
}

writeFileSync(loaderPath, src.replace(before, after));
console.log('[repro] patched tamagui-loader to fall back to css.mjs');
