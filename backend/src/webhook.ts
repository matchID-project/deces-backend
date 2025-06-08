import axios from 'axios';
import { sanitizeUrl } from '@braintree/sanitize-url';
import loggerStream from './logger';
import { URL } from 'url';
import net from 'net';
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

// Valid characters for domain names according to RFC 1035
const isValidDomainChar = (char: string): boolean => {
  return /^[a-z0-9-]$/i.test(char);
};

const isInvalidHostname = (hostname: string): { isValid: boolean; message?: string } => {
  // Reject localhost
  if (hostname === 'localhost') {
    return { isValid: false, message: 'Localhost is not allowed. Please use a valid domain name.' };
  }

  // Reject all IPs
  if (net.isIP(hostname)) {
    return { isValid: false, message: 'IP addresses are not allowed. Please use a valid domain name.' };
  }

  // Check domain structure
  const domainParts = hostname.split('.');
  if (domainParts.length < 2) {
    return { isValid: false, message: 'Domain must have at least a name and an extension (e.g., example.com)' }; // At least a domain and an extension
  }
  if (domainParts.some(part => part.length === 0)) {
    return { isValid: false, message: 'Domain parts cannot be empty (e.g., example..com is invalid)' }; // No empty parts
  }

  // Check valid characters for each part
  for (const part of domainParts) {
    // Check that each part doesn't start or end with a hyphen
    if (part.startsWith('-') || part.endsWith('-')) {
      return { isValid: false, message: 'Domain parts cannot start or end with a hyphen' };
    }

    // Check that each part only contains valid characters
    if (!part.split('').every(isValidDomainChar)) {
      return { isValid: false, message: 'Domain parts can only contain letters, numbers, and hyphens' };
    }
  }

  return { isValid: true };
};

export const validateWebhookUrl = (urlString: string): { isValid: boolean; message?: string } => {
  // Reject explicit port in the URL (e.g., :443, :8443, :80)
  if (/^https:\/\/[^/]+:[0-9]+(\/|$)/.test(urlString)) {
    return { isValid: false, message: 'Custom ports are not allowed. Please use the default HTTPS port (443)' };
  }
  // Reject @ in authority (user info) which indicates invalid character in hostname
  if (/^https:\/\/[A-Za-z0-9-]*@/.test(urlString)) {
    return { isValid: false, message: 'Domain parts can only contain letters, numbers, and hyphens' };
  }
  try {
    const parsed = new URL(urlString);
    // Check protocol (HTTPS only)
    if (parsed.protocol !== 'https:') {
      return { isValid: false, message: 'Only HTTPS protocol is allowed for security reasons' };
    }
    // Check hostname
    const hostnameValidation = isInvalidHostname(parsed.hostname);
    if (!hostnameValidation.isValid) {
      return hostnameValidation;
    }
    // Reject trailing slash after domain with no path (e.g., https://example.com/)
    if (/^https:\/\/[^/]+\/$/.test(urlString)) {
      return { isValid: false, message: 'Invalid hostname format' };
    }
    return { isValid: true };
  } catch (_error) {
    return { isValid: false, message: 'Invalid URL format. Please provide a valid HTTPS URL' };
  }
};

const BAN_DURATION_HOURS = 4;
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

export const requestChallenge = (url: string): { status: string; challenge?: string; msg?: string } => {
  const now = Date.now();
  let record = webhookRegistry.get(url);

  if (record) {
    if (record.status === 'validated') {
      return {
        status: 'validated',
        msg: 'Webhook is already registered and validated'
      };
    }
    if (record.status === 'banned' && record.bannedUntil && record.bannedUntil > now) {
      return {
        status: 'banned',
        msg: `Webhook is temporarily banned. Please try again in ${BAN_DURATION_HOURS} hours.`
      };
    }

    if (record.attempts >= 5) {
      record.status = 'banned';
      record.bannedUntil = now + BAN_DURATION_HOURS * 3600 * 1000;
      webhookRegistry.set(url, record);
      return {
        status: 'banned',
        msg: `Webhook is temporarily banned. Please try again in ${BAN_DURATION_HOURS} hours.`
      };
    }

    record.attempts += 1;
    webhookRegistry.set(url, record);
    return {
      status: 'initiated',
      challenge: record.challenge,
      msg: 'Please configure your webhook to respond with a text/html or json response containing the challenge.'
    };
  }

  const challenge = crypto.randomBytes(16).toString('hex');
  record = { status: 'initiated', challenge, createdAt: now, attempts: 1, fails: 0 };
  webhookRegistry.set(url, record);
  return {
    status: 'initiated',
    challenge,
    msg: 'Please configure your webhook to respond with a text/html or json response containing the challenge.'
  };
};

export const validateChallenge = async (url: string): Promise<{ status: string; msg?: string }> => {
  const now = Date.now();
  const urlValidationRes = (exports.validateWebhookUrl as typeof validateWebhookUrl)(url);

  const record = webhookRegistry.get(url);

  if (!record) {
    if (!urlValidationRes.isValid) {
      return { status: 'failed', msg: urlValidationRes.message };
    }
    return { status: 'failed', msg: 'No webhook registration found' };
  }

  if (!urlValidationRes.isValid) {
    return { status: 'failed', msg: urlValidationRes.message };
  }

  if (record.status === 'banned' && record.bannedUntil && record.bannedUntil > now) {
    return {
      status: 'banned',
      msg: `Webhook is temporarily banned. Please try again in ${BAN_DURATION_HOURS} hours.`
    };
  }

  if (record.status === 'validated') {
    return {
      status: 'validated',
      msg: 'Webhook is already validated'
    };
  }

  try {
    const parsed = new URL(url);
    const hostnameValidation = isInvalidHostname(parsed.hostname);
    if (!hostnameValidation.isValid) {
      throw new Error(hostnameValidation.message || 'Invalid hostname');
    }
    const sanitized = sanitizeUrl(url);
    if (sanitized === 'about:blank') {
      throw new Error('Invalid webhook URL');
    }
    const res = await axios.post(sanitized, { event: 'challenge' }, {
      maxRedirects: 0,
      timeout: 5000,
    });
    // Vérifier que la réponse est en text/html ou application/json
    const contentType = res.headers['content-type'];
    if (!contentType || (!contentType.includes('text/html') && !contentType.includes('application/json'))) {
      throw new Error('Invalid content type. Response must be text/html or application/json');
    }
    // If response body is JSON and has challenge, optionally verify
    const responseData = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    if (responseData && !responseData.includes(record.challenge)) {
      // Not critical for validation; log but continue
      log({ webhookWarn: 'Challenge not found in response, proceeding anyway' });
    }
    record.status = 'validated';
    record.fails = 0;
    webhookRegistry.set(url, record);
    return {
      status: 'validated',
      msg: 'Webhook is now validated and can be used with the bulk search API (csv/json).'
    };
  } catch (err) {
    log({ webhookError: (err as Error).toString() });
    record.fails += 1;

    if (record.fails >= 5) {
      record.status = 'banned';
      record.bannedUntil = now + BAN_DURATION_HOURS * 3600 * 1000;
      webhookRegistry.set(url, record);
      return {
        status: 'banned',
        msg: `Webhook is temporarily banned. Please try again in ${BAN_DURATION_HOURS} hours.`
      };
    }
    webhookRegistry.set(url, record);
    return {
      status: 'failed',
      msg: (err as Error).message || 'Challenge validation failed'
    };
  }
};

export const getWebhookStatus = (url: string): { status: string; msg?: string } => {
  const record = webhookRegistry.get(url);

  if (!record) {
    return { status: 'no record found' };
  }

  if (record.status === 'banned' && record.bannedUntil && record.bannedUntil > Date.now()) {
    return {
      status: 'banned',
      msg: `Webhook is temporarily banned. Please try again in ${BAN_DURATION_HOURS} hours.`
    };
  }

  if (record.status === 'initiated') {
    return {
      status: 'waiting for challenge',
      msg: 'Please configure your webhook to respond with a text/html or json response containing the challenge.'
    };
  }
  return { status: 'validated' };
};

export const sendWebhook = async (
  url: string | undefined,
  event: string,
  jobId?: string
): Promise<boolean> => {

  if (!url) {
    return false;
  }

  if (event !== 'challenge' && !isWebhookValidated(url)) {
    return false;
  }

  try {
    const urlValidationRes = (exports.validateWebhookUrl as typeof validateWebhookUrl)(url);
    if (!urlValidationRes.isValid) {
      throw new Error(urlValidationRes.message || 'Invalid webhook URL');
    }

    const parsed = new URL(url);

    if (isInvalidHostname(parsed.hostname).isValid === false) {
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

export const deleteWebhook = (url: string): { status: string; msg?: string } => {
  const record = webhookRegistry.get(url);

  if (!record) {
    return { status: 'no record found' };
  }

  webhookRegistry.delete(url);
  return {
    status: 'deleted',
    msg: 'Webhook has been successfully deleted'
  };
};