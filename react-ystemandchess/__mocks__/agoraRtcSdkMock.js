// The real Agora SDK touches browser-only APIs (ImageData, WebRTC) at import
// time and cannot load under jsdom. This stub lets components that use
// useAgoraCall render in tests; it never connects to anything.
const createTrack = () => ({
  play: jest.fn(),
  stop: jest.fn(),
  close: jest.fn(),
  on: jest.fn(),
  setMuted: jest.fn(() => Promise.resolve()),
  setVolume: jest.fn(),
});

const createClient = () => ({
  remoteUsers: [],
  on: jest.fn(),
  off: jest.fn(),
  removeAllListeners: jest.fn(),
  join: jest.fn(() => Promise.resolve()),
  leave: jest.fn(() => Promise.resolve()),
  publish: jest.fn(() => Promise.resolve()),
  unpublish: jest.fn(() => Promise.resolve()),
  subscribe: jest.fn(() => Promise.resolve()),
});

module.exports = {
  __esModule: true,
  default: {
    createClient: jest.fn(createClient),
    createMicrophoneAndCameraTracks: jest.fn(() =>
      Promise.resolve([createTrack(), createTrack()]),
    ),
    createScreenVideoTrack: jest.fn(() => Promise.resolve(createTrack())),
  },
};
