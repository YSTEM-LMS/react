import "@testing-library/jest-dom";

const { TextEncoder, TextDecoder } = require('util');

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

global.alert = jest.fn();

// The real Agora SDK can't load under jsdom. `npm test` (react-scripts) ignores
// jest.config.js, so its moduleNameMapper entry for the SDK doesn't apply there.
jest.mock("agora-rtc-sdk-ng", () => require("../__mocks__/agoraRtcSdkMock"));

global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};