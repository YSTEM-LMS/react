// Stands in for `import Icon from './icon.svg?react'` (vite-plugin-svgr),
// which yields a React component as the module's default export.
const React = require('react');
module.exports = {
  __esModule: true,
  default: (props) => React.createElement('svg', { 'data-testid': 'svg-mock', ...props }),
};
