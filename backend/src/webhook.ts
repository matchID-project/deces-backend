import axios from 'axios';
import loggerStream from './logger';
import { URL } from 'url';
import net from 'net';

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

export const validateWebhookUrl = (urlString: string): boolean => {
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
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

export const sendWebhook = async (
  url: string | undefined,
  event: string,
  jobId: string
): Promise<boolean> => {
  if (!url) {
    return false;
  }
  if (!validateWebhookUrl(url)) {
    log({ invalidWebhookUrl: url });
    return false;
  }
  try {
    const payload: any = { event, jobId };
    if (event === 'completed') {
      payload.url = `${process.env.APP_URL}/link?job=${jobId}`;
    }
    const res = await axios.post(url, payload, { maxRedirects: 0, timeout: 5000 });
    return res.status >= 200 && res.status < 300;
  } catch (err) {
    log({ webhookError: (err as Error).toString() });
    return false;
  }
};
