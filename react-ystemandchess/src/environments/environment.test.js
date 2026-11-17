const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

const composePath = path.resolve(process.cwd(), '..', 'docker-compose.yml');
const dockerfilePath = path.resolve(process.cwd(), 'Dockerfile');

const compose = YAML.parse(fs.readFileSync(composePath, 'utf8'));
const dockerfile = fs.readFileSync(dockerfilePath, 'utf8');

const getPublishedPort = (serviceName) => {
  const port = compose.services[serviceName].ports[0];
  return Number(String(port).split(':')[0]);
};

describe('frontend environment contract', () => {
  test('frontend service URLs match ports published by compose', () => {
    const args = compose.services.frontend.build.args;

    expect(args.REACT_APP_MIDDLEWARE_URL).toBe(
      `http://localhost:${getPublishedPort('middleware')}`
    );
    expect(args.REACT_APP_CHESS_SERVER_URL).toBe(
      `http://localhost:${getPublishedPort('chess-server')}`
    );
    expect(args.REACT_APP_CHESS_CLIENT_URL).toBe(
      `http://localhost:${getPublishedPort('chess-client')}`
    );
    expect(args.REACT_APP_STOCKFISH_SERVER_URL).toBe(
      `http://localhost:${getPublishedPort('stockfish-server')}`
    );
  });

  test('chess server and stockfish server do not share a port', () => {
    expect(getPublishedPort('chess-server')).not.toBe(
      getPublishedPort('stockfish-server')
    );
  });

  test('every frontend Docker ARG is supplied by compose', () => {
    const dockerArgs = [
      ...dockerfile.matchAll(/^ARG (REACT_APP_[A-Z0-9_]+)/gm),
    ].map((match) => match[1]);

    const composeArgs = Object.keys(compose.services.frontend.build.args);

    expect(composeArgs.sort()).toEqual(dockerArgs.sort());
  });
});
