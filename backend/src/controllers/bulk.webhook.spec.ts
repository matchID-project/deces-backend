import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import { BulkController } from './bulk.controller';
import * as webhookModule from '../webhook';
import * as processStream from '../processStream';

// Helper to create a mock express request
const createRequest = (webhook?: string): express.Request => {
  return {
    body: { webhook },
    files: [{}] as any, // ensure files length > 0
    user: { user: 'tester' }
  } as unknown as express.Request;
};

describe('BulkController - webhook integration', () => {
  const controller = new BulkController();

  beforeEach(() => {
    // Stub internal methods
    vi.spyOn(controller as any, 'handleFile').mockResolvedValue(true);
    vi.spyOn(processStream, 'csvHandle').mockResolvedValue({ msg: 'started' } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should reject bulk job when webhook is not validated', async () => {
    vi.spyOn(webhookModule, 'validateWebhookUrl').mockReturnValue({ isValid: true });
    vi.spyOn(webhookModule, 'isWebhookValidated').mockReturnValue(false);

    const res = await controller.uploadCsv(createRequest('https://example.com'));
    expect(res.msg).toBe('Webhook must be registered and validated before submitting a bulk job');
    expect(processStream.csvHandle).not.toHaveBeenCalled();
  });

  it('should accept bulk job when webhook is validated', async () => {
    vi.spyOn(webhookModule, 'validateWebhookUrl').mockReturnValue({ isValid: true });
    vi.spyOn(webhookModule, 'isWebhookValidated').mockReturnValue(true);

    const res = await controller.uploadCsv(createRequest('https://example.com'));
    expect(res.msg).toBe('started');
    expect(processStream.csvHandle).toHaveBeenCalled();
  });
});