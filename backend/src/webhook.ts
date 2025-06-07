import axios from 'axios';
import { sanitizeUrl } from '@braintree/sanitize-url';
import loggerStream from './logger';
import { URL } from 'url';
import net from 'net';
import dns from 'node:dns/promises';
import crypto from 'crypto';

const log = (json: any) => {
  loggerStream.write(
    JSON.stringify({
      backend: {
        'server-date': new Date(Date.now()).toISOString(),
        ...json,
      },
    })
  );
};

const privateRanges = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
];

const isPrivateHostname = (hostname: string): boolean => {
  if (hostname === 'localhost') return true;
  if (net.isIP(hostname)) {
    return privateRanges.some((r) => r.test(hostname));
  }
  return false;
};

const allowedPorts = [443, 8443];

const resolveIsPrivate = async (hostname: string): Promise<boolean> => {
  try {
    const { address } = await dns.lookup(hostname);
    return isPrivateHostname(address);
  } catch {
    return true;
  }
};

export const validateWebhookUrl = (urlString: string): boolean => {
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return false;
    }
    const port = parsed.port ? parseInt(parsed.port, 10) : (parsed.protocol === 'https:' ? 443 : 80);
    if (!allowedPorts.includes(port)) {
      return false;
    }
    if (isPrivateHostname(parsed.hostname)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

interface WebhookRecord {
  status: 'initiated' | 'validated' | 'banned';
  challenge: string;
  createdAt: number;
  attempts: number;
  fails: number;
  bannedUntil?: number;
}

export const webhookRegistry = new Map<string, WebhookRecord>();

export const isWebhookValidated = (url: string): boolean => {
  const record = webhookRegistry.get(url);
  return !!record && record.status === 'validated';
};

export const requestChallenge = (url: string): { status: string; challenge?: string } => {
  const now = Date.now();
  let record = webhookRegistry.get(url);
  if (record) {
    if (record.status === 'banned' && record.bannedUntil && record.bannedUntil > now) {
      return { status: 'banned' };
    }
    if (record.attempts >= 5) {
      record.status = 'banned';
      record.bannedUntil = now + 24 * 3600 * 1000;
      webhookRegistry.set(url, record);
      return { status: 'banned' };
    }
    record.attempts += 1;
    webhookRegistry.set(url, record);
    return { status: 'initiated', challenge: record.challenge };
  }
  const challenge = crypto.randomBytes(16).toString('hex');
  record = { status: 'initiated', challenge, createdAt: now, attempts: 1, fails: 0 };
  webhookRegistry.set(url, record);
  return { status: 'initiated', challenge };
};

export const validateChallenge = async (url: string): Promise<{ status: string; message?: string }> => {
  const now = Date.now();
  const record = webhookRegistry.get(url);
  if (!record) {
    return { status: 'failed', message: 'no challenge' };
  }
  if (record.status === 'banned' && record.bannedUntil && record.bannedUntil > now) {
    return { status: 'banned' };
  }
  const success = await sendWebhook(url, 'challenge', record.challenge);
  if (success) {
    record.status = 'validated';
    record.fails = 0;
    webhookRegistry.set(url, record);
    return { status: 'validated' };
  }
  record.fails += 1;
  if (record.fails >= 5) {
    record.status = 'banned';
    record.bannedUntil = now + 24 * 3600 * 1000;
    webhookRegistry.set(url, record);
    return { status: 'banned' };
  }
  webhookRegistry.set(url, record);
  return { status: 'failed', message: 'challenge request failed' };
};

export const sendWebhook = async (
  url: string | undefined,
  event: string,
  jobId: string
): Promise<boolean> => {
  if (!url) {
    return false;
  }
  if (event !== 'challenge' && !isWebhookValidated(url)) {
    return false;
  }
  try {
    if (!validateWebhookUrl(url)) {
      throw new Error('invalid webhook URL');
    }
    const parsed = new URL(url);
    if (await resolveIsPrivate(parsed.hostname)) {
      throw new Error('private host');
    }
    const payload: any = { event, jobId };
    if (event === 'completed') {
      payload.url = `${process.env.APP_URL}/link?job=${jobId}`;
    }
    const sanitized = sanitizeUrl(url);
    if (sanitized === 'about:blank') {
      throw new Error('invalid webhook URL');
    }
    const res = await axios.post(sanitized, payload, {
      maxRedirects: 0,
      timeout: 5000,
    });
    return res.status >= 200 && res.status < 300;
  } catch (err) {
    log({ webhookError: (err as Error).toString() });
    return false;
  }
};
