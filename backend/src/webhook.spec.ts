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
    vi.spyOn(axios, 'post').mockResolvedValue({
      status: 200,
      headers: { 'content-type': 'application/json' },
      data: { challenge: 'test-challenge' }
    });
    // Reset webhook registry before each test
    webhookRegistry.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return false when url is undefined', async () => {
    const res = await sendWebhook(undefined, 'started', '1');
    expect(res).toBe(false);
  });

  it('should POST event and jobId', async () => {
    vi.spyOn(webhookModule, 'validateWebhookUrl').mockReturnValue({ isValid: true });
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
    vi.spyOn(webhookModule, 'validateWebhookUrl').mockReturnValue({ isValid: true });
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
    vi.spyOn(webhookModule, 'validateWebhookUrl').mockReturnValue({ isValid: true });
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
    // Invalid protocols
    expect(validateWebhookUrl('ftp://example.com')).toEqual({ isValid: false, message: 'Only HTTPS protocol is allowed for security reasons' });
    expect(validateWebhookUrl('http://example.com')).toEqual({ isValid: false, message: 'Only HTTPS protocol is allowed for security reasons' });
    expect(validateWebhookUrl('ws://example.com')).toEqual({ isValid: false, message: 'Only HTTPS protocol is allowed for security reasons' });
    // URLs with specified ports
    expect(validateWebhookUrl('https://example.com:443')).toEqual({ isValid: false, message: 'Custom ports are not allowed. Please use the default HTTPS port (443)' });
    expect(validateWebhookUrl('https://example.com:8443')).toEqual({ isValid: false, message: 'Custom ports are not allowed. Please use the default HTTPS port (443)' });
    expect(validateWebhookUrl('https://example.com:80')).toEqual({ isValid: false, message: 'Custom ports are not allowed. Please use the default HTTPS port (443)' });
    // Invalid hostnames - all IPs are rejected
    expect(validateWebhookUrl('https://localhost')).toEqual({ isValid: false, message: 'Localhost is not allowed. Please use a valid domain name.' });
    expect(validateWebhookUrl('https://127.0.0.1')).toEqual({ isValid: false, message: 'IP addresses are not allowed. Please use a valid domain name.' });
    expect(validateWebhookUrl('https://192.168.1.1')).toEqual({ isValid: false, message: 'IP addresses are not allowed. Please use a valid domain name.' });
    expect(validateWebhookUrl('https://8.8.8.8')).toEqual({ isValid: false, message: 'IP addresses are not allowed. Please use a valid domain name.' }); // Public IP
    expect(validateWebhookUrl('https://1.1.1.1')).toEqual({ isValid: false, message: 'IP addresses are not allowed. Please use a valid domain name.' }); // Public IP
    expect(validateWebhookUrl('https://example')).toEqual({ isValid: false, message: 'Domain must have at least a name and an extension (e.g., example.com)' }); // No extension
    expect(validateWebhookUrl('https://example..com')).toEqual({ isValid: false, message: 'Domain parts cannot be empty (e.g., example..com is invalid)' }); // Empty part
    expect(validateWebhookUrl('https://example-.com')).toEqual({ isValid: false, message: 'Domain parts cannot start or end with a hyphen' }); // Hyphen at the end
    expect(validateWebhookUrl('https://-example.com')).toEqual({ isValid: false, message: 'Domain parts cannot start or end with a hyphen' }); // Hyphen at the start
    expect(validateWebhookUrl('https://example@.com')).toEqual({ isValid: false, message: 'Domain parts can only contain letters, numbers, and hyphens' }); // Invalid character
    expect(validateWebhookUrl('https://example.com/')).toEqual({ isValid: false, message: 'Invalid hostname format' }); // Trailing slash
  });

  it('should accept valid webhook URLs', () => {
    expect(validateWebhookUrl('https://example.com')).toEqual({ isValid: true });
    expect(validateWebhookUrl('https://sub.example.com')).toEqual({ isValid: true });
    expect(validateWebhookUrl('https://example.co.uk')).toEqual({ isValid: true });
    expect(validateWebhookUrl('https://example-domain.com')).toEqual({ isValid: true });
  });

  it('should return false when sanitization fails', async () => {
    vi.spyOn(webhookModule, 'validateWebhookUrl').mockReturnValue({ isValid: true });
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
    vi.spyOn(webhookModule, 'validateWebhookUrl').mockReturnValue({ isValid: true });
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
    vi.spyOn(webhookModule, 'validateWebhookUrl').mockReturnValue({ isValid: true });
    const url = 'https://example.com';
    const first = requestChallenge(url);
    expect(first.status).toBe('initiated');

    // Adapter le mock pour renvoyer le bon challenge dans la réponse
    (axios.post as any).mockResolvedValueOnce({
      status: 200,
      headers: { 'content-type': 'application/json' },
      data: { challenge: first.challenge }
    });

    const again = requestChallenge(url);
    expect(again.challenge).toBe(first.challenge);
    expect(isWebhookValidated(url)).toBe(false);
    const validateRes = await validateChallenge(url);
    expect(validateRes.status).toBe('validated');
    expect(isWebhookValidated(url)).toBe(true);
    expect((axios.post as any).mock.calls.pop()).toEqual([
      url,
      { event: 'challenge' },
      { maxRedirects: 0, timeout: 5000 },
    ]);
  });
});
