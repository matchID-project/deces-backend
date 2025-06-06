import http from 'http';
import { describe, expect, it } from 'vitest';
import { sendWebhook } from './webhook';

// We rely on a local HTTP server rather than an external service (e.g.
// webhook.site) so tests remain fully offline.

const waitClose = (server: http.Server): Promise<void> => {
  return new Promise(resolve => server.close(() => resolve()));
};

describe('webhook.ts - sendWebhook', () => {
  it('should return false when url is undefined', async () => {
    const res = await sendWebhook(undefined, 'started', '1');
    expect(res).toBe(false);
  });

  it('should POST event and jobId', async () => {
    process.env.APP_URL = 'http://app';
    let body: any;
    const server = http.createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', () => {
        body = JSON.parse(Buffer.concat(chunks).toString());
        res.statusCode = 200;
        res.end('ok');
      });
    });
    await new Promise(resolve => server.listen(0, resolve));
    const port = (server.address() as any).port;
    const result = await sendWebhook(`http://localhost:${port}`, 'completed', 'abc');
    await waitClose(server);
    expect(result).toBe(true);
    expect(body).toEqual({ event: 'completed', jobId: 'abc', url: 'http://app/link?job=abc' });
  });

  it('should not include url for non-completed events', async () => {
    process.env.APP_URL = 'http://app';
    let body: any;
    const server = http.createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', () => {
        body = JSON.parse(Buffer.concat(chunks).toString());
        res.statusCode = 200;
        res.end('ok');
      });
    });
    await new Promise(resolve => server.listen(0, resolve));
    const port = (server.address() as any).port;
    const result = await sendWebhook(`http://localhost:${port}`, 'failed', 'abc');
    await waitClose(server);
    expect(result).toBe(true);
    expect(body).toEqual({ event: 'failed', jobId: 'abc' });
  });

  it('should return false when request fails', async () => {
    const result = await sendWebhook('http://localhost:9', 'completed', 'abc');
    expect(result).toBe(false);
  });

  it('should return false on server error', async () => {
    const server = http.createServer((_req, res) => {
      res.statusCode = 500;
      res.end();
    });
    await new Promise(resolve => server.listen(0, resolve));
    const port = (server.address() as any).port;
    const result = await sendWebhook(`http://localhost:${port}`, 'completed', 'abc');
    await waitClose(server);
    expect(result).toBe(false);
  });
});
