const fs = require('fs');
const path = require('path');
const YAML = require('yaml');
const { environment: prod } = require('./environment.prod');

const composePath = path.resolve(process.cwd(), '..', 'docker-compose.yml');
const dockerfilePath = path.resolve(process.cwd(), 'Dockerfile');
const nginxTemplatePath = path.resolve(process.cwd(), 'nginx', 'default.conf.template');

const compose = YAML.parse(fs.readFileSync(composePath, 'utf8'));
const dockerfile = fs.readFileSync(dockerfilePath, 'utf8');
const nginxTemplate = fs.readFileSync(nginxTemplatePath, 'utf8');

const getContainerPort = (serviceName) => {
  const port = compose.services[serviceName].ports[0];
  return Number(String(port).split(':')[1]);
};

const getPublishedPort = (serviceName) => {
  const port = compose.services[serviceName].ports[0];
  return Number(String(port).split(':')[0]);
};

describe('frontend environment contract', () => {
  test('production service URLs are relative to the page origin', () => {
    Object.values(prod.urls).forEach((url) => {
      expect(url).toMatch(/^\/[a-z]+$/);
    });
  });

  test('nginx proxies every production service prefix', () => {
    Object.values(prod.urls).forEach((url) => {
      expect(nginxTemplate).toContain(`location ${url}/ {`);
    });
  });

  test('compose points the nginx upstreams at the compose services', () => {
    const env = compose.services.frontend.environment;

    expect(env.MIDDLEWARE_UPSTREAM).toBe(
      `http://middleware:${getContainerPort('middleware')}`
    );
    expect(env.CHESS_SERVER_UPSTREAM).toBe(
      `http://chess-server:${getContainerPort('chess-server')}`
    );
    expect(env.STOCKFISH_UPSTREAM).toBe(
      `http://stockfish-server:${getContainerPort('stockfish-server')}`
    );
    expect(env.CHESS_CLIENT_UPSTREAM).toBe(
      `http://chess-client:${getContainerPort('chess-client')}`
    );
  });

  test('every upstream the template uses has a Dockerfile default', () => {
    const used = [...nginxTemplate.matchAll(/\$\{([A-Z_]+)\}/g)].map((m) => m[1]);

    expect(used.length).toBeGreaterThan(0);
    used.forEach((name) => {
      expect(dockerfile).toMatch(new RegExp(`\\b${name}=`));
    });
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
