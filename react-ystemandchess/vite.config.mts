import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';

// Every REACT_APP_* variable the app reads. Each one is inlined by `define`
// below. A variable missing from this list reaches the browser as a live
// `process.env` reference and crashes the page on load (`process` is not
// defined there). CI fails the build if `process.env` survives into build/.
const APP_ENV_VARS = [
  'REACT_APP_MIDDLEWARE_URL',
  'REACT_APP_STOCKFISH_SERVER_URL',
  'REACT_APP_CHESS_SERVER_URL',
  'REACT_APP_CHESS_CLIENT_URL',
  'REACT_APP_AGORA_APP_ID',
] as const;

// Replaces react-scripts (Create React App), which is unmaintained upstream and
// pinned a vulnerable build toolchain it could not be upgraded away from.
export default defineConfig(({ mode }) => {
  // Matches CRA: values come from the shell/CI env or from .env, .env.local,
  // .env.[mode] and .env.[mode].local, with the shell taking precedence.
  const env = loadEnv(mode, process.cwd(), 'REACT_APP_');
  const nodeEnv = mode === 'production' ? 'production' : 'development';

  return {
    plugins: [
      react(),
      // `import Icon from './icon.svg?react'` -> React component.
      // A bare `import url from './icon.svg'` stays an asset URL, as before.
      svgr(),
    ],

    build: {
      // CRA emitted to build/. Keeping that name means Dockerfile's `serve -s build`
      // and any deploy scripts continue to work untouched.
      outDir: 'build',
      sourcemap: true,
    },

    server: {
      // Matches the port CRA used and the baseURL in playwright.config.ts.
      port: 3000,
      strictPort: true,
    },

    // Vite exposes env via import.meta.env, but src/environments reads
    // process.env directly. Defining the values here keeps it working unchanged
    // under both Vite and Jest (where import.meta would need extra Babel
    // plumbing).
    define: {
      ...Object.fromEntries(
        APP_ENV_VARS.map((name) => [
          `process.env.${name}`,
          JSON.stringify(env[name] ?? ''),
        ])
      ),
      'process.env.NODE_ENV': JSON.stringify(nodeEnv),
    },
  };
});
