// babel.config.js
//
// Used by babel-jest only. Vite transforms application code with esbuild and
// does not read this file, so these presets are tuned for the Jest/Node runtime.
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    // Matches the automatic JSX runtime the source tree already assumes:
    // components render JSX without importing React.
    ['@babel/preset-react', { runtime: 'automatic' }],
    '@babel/preset-typescript',
  ],
};
