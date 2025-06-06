import http from 'http';
import { describe, expect, it } from 'vitest';
import { WebhookValidationController } from './webhook.controller';

const waitClose = (server: http.Server): Promise<void> => {
  return new Promise(resolve => server.close(() => resolve()));
};

describe('webhook.controller.ts', () => {
  const controller = new WebhookValidationController();

  it('should fail validation when no challenge was requested', async () => {
    const res = await controller.webhook({ url: 'http://localhost:1', challenge: 'validate' });
    expect(res.status).toBe('failed');
  });

  it('should run full challenge workflow', async () => {
    const server = http.createServer((_req, res) => { res.statusCode = 200; res.end(); });
    await new Promise(resolve => server.listen(0, resolve));
    const port = (server.address() as any).port;
    const url = `http://localhost:${port}`;
    const init = await controller.webhook({ url, challenge: 'get' });
    expect(init.status).toBe('initiated');
    const validate = await controller.webhook({ url, challenge: 'validate' });
    expect(validate.status).toBe('validated');
    await waitClose(server);
  });

  it('should return same challenge on multiple get requests', async () => {
    const first = await controller.webhook({ url: 'http://example.com', challenge: 'get' });
    const second = await controller.webhook({ url: 'http://example.com', challenge: 'get' });
    expect(second.challenge).toBe(first.challenge);
  });
});
