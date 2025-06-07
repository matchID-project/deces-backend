import axios from 'axios';
import * as jwks from 'jwks-rsa';
import * as jwt from 'jsonwebtoken';

export const auth0Client = jwks.createRemoteJWKSet(new URL(`https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`));

export async function verifyAuth0Token(token: string): Promise<any> {
  return await jwt.verify(token, async (header, callback) => {
    try {
      const key = await auth0Client.getKey(header as any);
      callback(null, key.publicKey || key.rsaPublicKey);
    } catch (err) {
      callback(err as any, undefined);
    }
  }, {
    audience: process.env.AUTH0_AUDIENCE,
    issuer: `https://${process.env.AUTH0_DOMAIN}/`,
    algorithms: ['RS256']
  });
}

export async function sendAuth0OTP(email: string) {
  const res = await axios.post(`https://${process.env.AUTH0_DOMAIN}/passwordless/start`, {
    client_id: process.env.AUTH0_CLIENT_ID,
    connection: 'email',
    send: 'code',
    email
  });
  return res.data;
}

export async function verifyAuth0OTP(email: string, otp: string) {
  const res = await axios.post(`https://${process.env.AUTH0_DOMAIN}/oauth/token`, {
    grant_type: 'http://auth0.com/oauth/grant-type/passwordless/otp',
    client_id: process.env.AUTH0_CLIENT_ID,
    otp,
    realm: 'email',
    username: email,
    audience: process.env.AUTH0_AUDIENCE,
    scope: 'openid profile email offline_access'
  });
  return res.data;
}

export async function createApiKey(expiresIn: number) {
  const res = await axios.post(`https://${process.env.AUTH0_DOMAIN}/oauth/token`, {
    client_id: process.env.AUTH0_CLIENT_ID,
    client_secret: process.env.AUTH0_CLIENT_SECRET,
    audience: process.env.AUTH0_AUDIENCE,
    grant_type: 'client_credentials',
    expires_in: expiresIn
  });
  return res.data;
}
