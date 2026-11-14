// Fails CI when build-time env vars did not make it into the production bundle.
//
// Jest runs in Node, where `process` exists, so env-handling bugs pass every
// unit test and only surface as a blank page in the browser. This checks the
// built output directly:
//
//   1. No `process.env` reference survives in shipped JS/HTML. Anything the
//      `define` block in vite.config.mts doesn't inline would be left as a
//      live reference.
//   2. Every required URL set in the environment is inlined verbatim. Vite
//      rewrites a leftover bare `process.env` to `{}`. So a dynamic lookup
//      like process.env[name] passes check 1 but compiles to `{}[name]`,
//      which is always undefined. Check 2 catches that case.
//
// Usage (after `npm run build`, with the same env the build used):
//   node scripts/verify-build-env.mjs

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const BUILD_DIR = 'build';
const REQUIRED_VARS = [
  'REACT_APP_MIDDLEWARE_URL',
  'REACT_APP_STOCKFISH_SERVER_URL',
  'REACT_APP_CHESS_SERVER_URL',
];

const listFiles = (dir) =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });

// Sourcemaps embed the original source, which legitimately says process.env.
const shipped = listFiles(BUILD_DIR).filter((file) => /\.(js|html)$/.test(file));
const contents = shipped.map((file) => ({ file, text: readFileSync(file, 'utf8') }));

const errors = [];

for (const { file, text } of contents) {
  if (text.includes('process.env')) {
    errors.push(`${file} still references process.env`);
  }
}

const bundle = contents.map(({ text }) => text).join('\n');
for (const name of REQUIRED_VARS) {
  const value = process.env[name];
  if (!value) {
    errors.push(`${name} is not set; run this with the env the build used`);
  } else if (!bundle.includes(value)) {
    errors.push(`${name} (${value}) was not inlined into the bundle`);
  }
}

if (shipped.length === 0) {
  errors.push(`no .js/.html files found in ${BUILD_DIR}/; did the build run?`);
}

if (errors.length > 0) {
  console.error('Build env verification failed:');
  errors.forEach((error) => console.error(`  - ${error}`));
  process.exit(1);
}

console.log(`Build env verified across ${shipped.length} files.`);
