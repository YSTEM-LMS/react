import { socketTarget } from './socketTarget';

describe('socketTarget', () => {
  test('absolute dev URL keeps its host and the default path', () => {
    expect(socketTarget('http://localhost:3001')).toEqual({
      url: 'http://localhost:3001',
      path: '/socket.io',
    });
  });

  test('relative prefix connects to the page origin with a prefixed path', () => {
    expect(socketTarget('/chessserver')).toEqual({
      url: window.location.origin,
      path: '/chessserver/socket.io',
    });
  });

  test('a trailing slash on the prefix is ignored', () => {
    expect(socketTarget('/stockfishserver/').path).toBe('/stockfishserver/socket.io');
  });
});
