import dns from 'node:dns/promises';
import axios from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@braintree/sanitize-url', () => ({ sanitizeUrl: vi.fn((url: string) => url) }));

import { sanitizeUrl } from '@braintree/sanitize-url';
import * as webhookModule from './webhook';
const { sendWebhook, validateWebhookUrl, requestChallenge, validateChallenge, webhookRegistry, isWebhookValidated } = webhookModule;

describe('webhook.ts - sendWebhook', () => {
  beforeEach(() => {
    vi.spyOn(dns, 'lookup').mockResolvedValue({ address: '203.0.113.10', family: 4 });
    vi.spyOn(axios, 'post').mockResolvedValue({ status: 200 });
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
    vi.spyOn(webhookModule, 'validateWebhookUrl').mockReturnValue(true);
    process.env.APP_URL = 'http://app';
    webhookRegistry.set('https://example.com', {
      status: 'validated',
      challenge: '',
      createdAt: Date.now(),
      attempts: 1,
      fails: 0,
    });
    const result = await sendWebhook('https://example.com', 'completed', 'abc');
    expect(result).toBe(true);
    expect((axios.post as any).mock.calls[0]).toEqual([
      'https://example.com',
      { event: 'completed', jobId: 'abc', url: 'http://app/link?job=abc' },
      { maxRedirects: 0, timeout: 5000 },
    ]);
  });

  it('should not include url for non-completed events', async () => {
    vi.spyOn(webhookModule, 'validateWebhookUrl').mockReturnValue(true);
    process.env.APP_URL = 'http://app';
    webhookRegistry.set('https://example.com', {
      status: 'validated',
      challenge: '',
      createdAt: Date.now(),
      attempts: 1,
      fails: 0,
    });
    const result = await sendWebhook('https://example.com', 'failed', 'abc');
    expect(result).toBe(true);
    expect((axios.post as any).mock.calls[0]).toEqual([
      'https://example.com',
      { event: 'failed', jobId: 'abc' },
      { maxRedirects: 0, timeout: 5000 },
    ]);
  });

  it('should return false when request fails', async () => {
    vi.spyOn(webhookModule, 'validateWebhookUrl').mockReturnValue(true);
    (axios.post as any).mockRejectedValueOnce(new Error('fail'));
    webhookRegistry.set('https://example.com', {
      status: 'validated',
      challenge: '',
      createdAt: Date.now(),
      attempts: 1,
      fails: 0,
    });
    const result = await sendWebhook('https://example.com', 'completed', 'abc');
    expect(result).toBe(false);
  });

  it('should reject invalid webhook URLs', () => {
    expect(validateWebhookUrl('ftp://example.com')).toBe(false);
    expect(validateWebhookUrl('http://localhost:8000')).toBe(false);
  });

  it('should return false when sanitization fails', async () => {
    vi.spyOn(webhookModule, 'validateWebhookUrl').mockReturnValue(true);
    (sanitizeUrl as any).mockReturnValue('about:blank');
    webhookRegistry.set('https://example.com', {
      status: 'validated',
      challenge: '',
      createdAt: Date.now(),
      attempts: 1,
      fails: 0,
    });
    const result = await sendWebhook('https://example.com', 'completed', 'abc');
    expect(result).toBe(false);
  });

  it('should return false on server error', async () => {
    vi.spyOn(webhookModule, 'validateWebhookUrl').mockReturnValue(true);
    (axios.post as any).mockResolvedValueOnce({ status: 500 });
    webhookRegistry.set('https://example.com', {
      status: 'validated',
      challenge: '',
      createdAt: Date.now(),
      attempts: 1,
      fails: 0,
    });
    const result = await sendWebhook('https://example.com', 'completed', 'abc');
    expect(result).toBe(false);
  });

  it('should manage challenge workflow', async () => {
    vi.spyOn(webhookModule, 'validateWebhookUrl').mockReturnValue(true);
    const url = 'https://example.com';
    const first = requestChallenge(url);
    expect(first.status).toBe('initiated');
    const again = requestChallenge(url);
    expect(again.challenge).toBe(first.challenge);
    expect(isWebhookValidated(url)).toBe(false);
    const validateRes = await validateChallenge(url);
    expect(validateRes.status).toBe('validated');
    expect(isWebhookValidated(url)).toBe(true);
    expect((axios.post as any).mock.calls.pop()).toEqual([
      url,
      { event: 'challenge', jobId: first.challenge },
      { maxRedirects: 0, timeout: 5000 },
    ]);
  });
});
