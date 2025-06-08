import dns from 'node:dns/promises';
import axios from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebhookValidationController } from './webhook.controller';
import * as webhookModule from '../webhook';

describe('webhook.controller.ts', () => {
  const controller = new WebhookValidationController();

  beforeEach(() => {
    vi.spyOn(dns, 'lookup').mockResolvedValue({ address: '203.0.113.10', family: 4 });
    vi.spyOn(webhookModule, 'validateWebhookUrl').mockReturnValue({ isValid: true });
    vi.spyOn(axios, 'post').mockResolvedValue({
      status: 200,
      headers: { 'content-type': 'application/json' },
      data: { challenge: 'test-challenge' }
    });
    // Reset webhook registry before each test
    webhookModule.webhookRegistry.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fail validation when no record was found', async () => {
    const res = await controller.webhook({ url: 'http://localhost:1', action: 'challenge' });
    expect(res.status).toBe('failed');
    expect(res.msg).toBe('No webhook registration found');
  });

  it('should run full webhook registration workflow', async () => {
    const url = 'https://example.com';
    // Register webhook
    const register = await controller.webhook({ url, action: 'register' });
    expect(register.status).toBe('initiated');
    expect(register.challenge).toBeDefined();
    expect(register.msg).toBe('Please configure your webhook to respond with a text/html or json response containing the challenge.');

    // Adapter le mock pour renvoyer le challenge correct
    (axios.post as any).mockResolvedValueOnce({
      status: 200,
      headers: { 'content-type': 'application/json' },
      data: { challenge: register.challenge }
    });

    // Check status after registration
    const statusAfterRegister = await controller.webhook({ url, action: 'status' });
    expect(statusAfterRegister.status).toBe('waiting for challenge');
    expect(statusAfterRegister.msg).toBe('Please configure your webhook to respond with a text/html or json response containing the challenge.');
    // Validate webhook
    const validate = await controller.webhook({ url, action: 'challenge' });
    expect(validate.status).toBe('validated');
    expect(validate.msg).toBe('Webhook is now validated and can be used with the bulk search API (csv/json).');
    // Check status after validation
    const statusAfterValidate = await controller.webhook({ url, action: 'status' });
    expect(statusAfterValidate.status).toBe('validated');
  });

  it('should return same challenge on multiple register requests', async () => {
    const first = await controller.webhook({ url: 'http://example.com', action: 'register' });
    const second = await controller.webhook({ url: 'http://example.com', action: 'register' });
    expect(second.challenge).toBe(first.challenge);
  });

  it('should handle banned webhook status', async () => {
    const url = 'https://example.com';
    // Register and fail validation multiple times to get banned
    await controller.webhook({ url, action: 'register' });
    for (let i = 0; i < 5; i++) {
      vi.spyOn(axios, 'post').mockRejectedValueOnce(new Error('Failed'));
      await controller.webhook({ url, action: 'challenge' });
    }
    // Check banned status
    const status = await controller.webhook({ url, action: 'status' });
    expect(status.status).toBe('banned');
    expect(status.msg).toContain('Webhook is temporarily banned');
    expect(status.msg).toContain('4 hours');
  });

  it('should return no record found for unknown webhook', async () => {
    const status = await controller.webhook({ url: 'https://unknown.com', action: 'status' });
    expect(status.status).toBe('no record found');
  });

  it('should handle webhook deletion', async () => {
    const url = 'https://example.com';
    // Register webhook first
    await controller.webhook({ url, action: 'register' });
    // Verify it exists
    const statusBefore = await controller.webhook({ url, action: 'status' });
    expect(statusBefore.status).toBe('waiting for challenge');
    // Delete webhook
    const deleteResult = await controller.webhook({ url, action: 'delete' });
    expect(deleteResult.status).toBe('deleted');
    expect(deleteResult.msg).toBe('Webhook has been successfully deleted');
    // Verify it's gone
    const statusAfter = await controller.webhook({ url, action: 'status' });
    expect(statusAfter.status).toBe('no record found');
  });

  it('should handle deletion of non-existent webhook', async () => {
    const deleteResult = await controller.webhook({
      url: 'https://nonexistent.com',
      action: 'delete'
    });
    expect(deleteResult.status).toBe('no record found');
  });

  it('should not revalidate an already validated webhook', async () => {
    const url = 'https://example.com';

    // Register and validate webhook
    const register = await controller.webhook({ url, action: 'register' });
    (axios.post as any).mockResolvedValueOnce({
      status: 200,
      headers: { 'content-type': 'application/json' },
      data: { challenge: register.challenge }
    });
    await controller.webhook({ url, action: 'challenge' });

    // Try to validate again
    const validateAgain = await controller.webhook({ url, action: 'challenge' });
    expect(validateAgain.status).toBe('validated');
    expect(validateAgain.msg).toBe('Webhook is already validated');

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(axios.post).toHaveBeenCalledTimes(1);
  });

  it('should handle invalid webhook URLs', async () => {
    const url = 'http://example.com';
    vi.spyOn(webhookModule, 'validateWebhookUrl').mockReturnValue({
      isValid: false,
      message: 'Only HTTPS protocol is allowed for security reasons'
    });
    const result = await controller.webhook({ url, action: 'challenge' });
    expect(result.status).toBe('failed');
    expect(result.msg).toBe('Only HTTPS protocol is allowed for security reasons');
  });

  it('should handle validation errors', async () => {
    const url = 'https://example.com';
    vi.spyOn(webhookModule, 'validateWebhookUrl').mockReturnValue({
      isValid: false,
      message: 'Invalid URL format. Please provide a valid HTTPS URL'
    });
    const result = await controller.webhook({ url, action: 'challenge' });
    expect(result.status).toBe('failed');
    expect(result.msg).toBe('Invalid URL format. Please provide a valid HTTPS URL');
  });

  it('should return validated status when registering an already validated webhook', async () => {
    const url = 'https://example.com';
    // Register and validate webhook
    await controller.webhook({ url, action: 'register' });
    await controller.webhook({ url, action: 'challenge' });
    // Try to register again
    const registerAgain = await controller.webhook({ url, action: 'register' });
    expect(registerAgain.status).toBe('validated');
    expect(registerAgain.msg).toBe('Webhook is already registered and validated');
  });
});
