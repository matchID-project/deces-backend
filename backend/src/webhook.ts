import axios from 'axios';
import loggerStream from './logger';

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

export const sendWebhook = async (
  url: string | undefined,
  event: string,
  jobId: string
): Promise<boolean> => {
  if (!url) {
    return false;
  }
  try {
    const payload: any = { event, jobId };
    if (event === 'completed') {
      payload.url = `${process.env.APP_URL}/link?job=${jobId}`;
    }
    const res = await axios.post(url, payload);
    return res.status >= 200 && res.status < 300;
  } catch (err) {
    log({ webhookError: (err as Error).toString() });
    return false;
  }
};
