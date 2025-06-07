import http from 'http';
import dns from 'node:dns/promises';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sendWebhook, validateWebhookUrl, requestChallenge, validateChallenge, webhookRegistry, isWebhookValidated } from './webhook';

// We rely on a local HTTP server rather than an external service (e.g.
// webhook.site) so tests remain fully offline.

const waitClose = (server: http.Server): Promise<void> => {
  return new Promise(resolve => server.close(() => resolve()));
};

describe('webhook.ts - sendWebhook', () => {
  beforeEach(() => {
    vi.spyOn(dns, 'lookup').mockResolvedValue({ address: '203.0.113.10', family: 4 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    webhookRegistry.clear();
  });
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

  it('should reject invalid webhook URLs', async () => {
    expect(validateWebhookUrl('ftp://example.com')).toBe(false);
    expect(validateWebhookUrl('http://localhost:8000')).toBe(false);
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

  it('should manage challenge workflow', async () => {
    const server = http.createServer((_req, res) => {
      res.statusCode = 200;
      res.end();
    });
    await new Promise(resolve => server.listen(0, resolve));
    const port = (server.address() as any).port;
    const url = `http://localhost:${port}`;
    const first = requestChallenge(url);
    expect(first.status).toBe('initiated');
    const again = requestChallenge(url);
    expect(again.challenge).toBe(first.challenge);
    expect(isWebhookValidated(url)).toBe(false);
    const validateRes = await validateChallenge(url);
    expect(validateRes.status).toBe('validated');
    expect(isWebhookValidated(url)).toBe(true);
    await waitClose(server);
  });
});
