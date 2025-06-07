import dns from 'node:dns/promises';
import axios from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebhookValidationController } from './webhook.controller';
import * as webhookModule from '../webhook';

describe('webhook.controller.ts', () => {
  const controller = new WebhookValidationController();

  beforeEach(() => {
    vi.spyOn(dns, 'lookup').mockResolvedValue({ address: '203.0.113.10', family: 4 });
    vi.spyOn(webhookModule, 'validateWebhookUrl').mockReturnValue(true);
    vi.spyOn(axios, 'post').mockResolvedValue({ status: 200 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fail validation when no challenge was requested', async () => {
    const res = await controller.webhook({ url: 'http://localhost:1', challenge: 'validate' });
    expect(res.status).toBe('failed');
  });

  it('should run full challenge workflow', async () => {
    const url = 'https://example.com';
    const init = await controller.webhook({ url, challenge: 'get' });
    expect(init.status).toBe('initiated');
    const validate = await controller.webhook({ url, challenge: 'validate' });
    expect(validate.status).toBe('validated');
  });

  it('should return same challenge on multiple get requests', async () => {
    const first = await controller.webhook({ url: 'http://example.com', challenge: 'get' });
    const second = await controller.webhook({ url: 'http://example.com', challenge: 'get' });
    expect(second.challenge).toBe(first.challenge);
  });
});
