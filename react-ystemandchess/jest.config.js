module.exports = {
  transform: {
    "^.+\\.(ts|tsx|js|jsx)$": "babel-jest",
  },
  // `uuid` ships ESM-only under the browser export condition jsdom selects, so it
  // must go through babel instead of being skipped as a node_modules file.
  transformIgnorePatterns: ['/node_modules/(?!uuid)/'],
  moduleNameMapper: {
    // Order matters: the `?react` form must be matched before the bare `.svg` form.
    '\\.svg\\?react$': '<rootDir>/__mocks__/svgrComponentMock.js',
    '\\.(css|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif)$': '<rootDir>/__mocks__/fileMock.js',
    '\\.svg$': '<rootDir>/__mocks__/svgrMock.js',
    '^react-cookie$': '<rootDir>/node_modules/react-cookie',
    '^socket\\.io-client$': 'socket.io-client/dist/socket.io.js',
  },
  // Playwright specs live in e2e/ and must not be collected by Jest.
  // (react-scripts scoped test discovery to src/; standalone Jest does not.)
  testPathIgnorePatterns: ['<rootDir>/e2e/', '<rootDir>/node_modules/'],
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  // react-scripts supplied these implicitly via its own Jest config:
  //   setupFiles         -> react-app-polyfill/jsdom (which is just whatwg-fetch)
  //   setupFilesAfterEnv -> src/setupTests.ts
  // Standalone Jest has to be told about both.
  setupFiles: ['whatwg-fetch'],
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleDirectories: ['node_modules', 'src'],
};
