import http from 'http';
import { AddressInfo } from 'net';

// Allow loopback so the engine really hits our local capture server.
process.env.ATTACK_ALLOWLIST = 'localhost,127.0.0.1';
process.env.ATTACK_BLOCK_BEHAVIOR = 'continue';

import { mockRunRepo, setScenario } from './mocks/mockRepos';
import { getRun } from './setupTests';

// Use the real HttpExecutor (we want real HTTP), but mock the repositories.
jest.mock('../repositories/runRepository', () => mockRunRepo);
jest.mock('../repositories/scenarioRepository', () => require('./mocks/mockRepos').mockScenarioRepo);

import runService from '../services/runService';

interface CapturedRequest {
  method: string;
  url: string;
  headers: http.IncomingHttpHeaders;
  body: string;
}

describe('AttackEngine http headers & payload', () => {
  let server: http.Server;
  let baseUrl: string;
  let captured: CapturedRequest[];

  beforeAll((done) => {
    captured = [];
    server = http.createServer((req, res) => {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        captured.push({ method: req.method || '', url: req.url || '', headers: req.headers, body });
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('ok');
      });
    });
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      baseUrl = `http://127.0.0.1:${port}`;
      done();
    });
  });

  afterAll((done) => { server.close(() => done()); });

  async function waitForRun(runId: string, timeout = 3000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const r = await getRun(runId);
      if (r && (r.status === 'completed' || r.status === 'failed')) return r;
      await new Promise((res) => setTimeout(res, 25));
    }
    throw new Error('Timeout waiting for run');
  }

  it('substitutes a named payload into url, body and headers, and forwards headers', async () => {
    captured.length = 0;
    const scenarioId = 'feat-1';
    setScenario(scenarioId, {
      _id: scenarioId,
      name: 'sqli-probe',
      steps: [
        {
          type: 'http',
          method: 'POST',
          url: `${baseUrl}/search?q={{payload}}`,
          headers: { 'X-Test': 'cyberdojo', 'X-Attack': '{{payload}}' },
          body: 'username={{payload}}',
          payload: 'sqlInjection',
        },
      ],
    });

    const run = await runService.createRun(scenarioId);
    const finished = await waitForRun(run._id);
    expect(finished.status).toBe('completed');

    expect(captured).toHaveLength(1);
    const req = captured[0];
    const expectedPayload = "' OR '1'='1";

    expect(req.method).toBe('POST');
    // URL carries the url-encoded payload
    expect(decodeURIComponent(req.url)).toContain(expectedPayload);
    // Static header forwarded verbatim
    expect(req.headers['x-test']).toBe('cyberdojo');
    // Header with token substituted
    expect(req.headers['x-attack']).toBe(expectedPayload);
    // Body with token substituted
    expect(req.body).toContain(expectedPayload);

    // A structured log records which payload was used
    const logs = (finished.logs || [])
      .map((l: string) => { try { return JSON.parse(l); } catch { return null; } })
      .filter(Boolean);
    expect(logs.some((x: any) => typeof x.message === 'string' && x.message.includes('Using payload'))).toBe(true);
  });

  it('treats an unknown payload name as a literal custom payload', async () => {
    captured.length = 0;
    const scenarioId = 'feat-2';
    const custom = 'MY_CUSTOM_STRING';
    setScenario(scenarioId, {
      _id: scenarioId,
      name: 'custom-payload',
      steps: [
        { type: 'http', method: 'GET', url: `${baseUrl}/?p={{payload}}`, payload: custom },
      ],
    });

    const run = await runService.createRun(scenarioId);
    const finished = await waitForRun(run._id);
    expect(finished.status).toBe('completed');

    expect(captured).toHaveLength(1);
    expect(decodeURIComponent(captured[0].url)).toContain(custom);
  });

  it('sends a step with no payload unchanged', async () => {
    captured.length = 0;
    const scenarioId = 'feat-3';
    setScenario(scenarioId, {
      _id: scenarioId,
      name: 'no-payload',
      steps: [
        { type: 'http', method: 'GET', url: `${baseUrl}/health`, headers: { 'X-Only': 'value' } },
      ],
    });

    const run = await runService.createRun(scenarioId);
    const finished = await waitForRun(run._id);
    expect(finished.status).toBe('completed');

    expect(captured).toHaveLength(1);
    expect(captured[0].url).toBe('/health');
    expect(captured[0].headers['x-only']).toBe('value');
  });
});
