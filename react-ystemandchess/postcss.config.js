// react-scripts auto-detected tailwind.config.js and injected the tailwindcss
// PostCSS plugin implicitly (its webpack.config.js did this behind the scenes),
// so this project never needed a PostCSS config of its own. Vite has no such
// convention, so the pipeline is now declared explicitly.
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
