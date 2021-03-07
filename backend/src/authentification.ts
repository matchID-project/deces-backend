import * as express from "express";

export function expressAuthentication(
  request: express.Request,
  securityName: string,
  scopes?: string[]
): Promise<any> {
  if (securityName === "api_key") {
    let token;
    if (request.query && request.query.access_token) {
      token = request.query.access_token;
    }

    if (token === process.env.BACKEND_ACCESS_TOKEN) {
      return Promise.resolve({});
    } else {
      return Promise.reject({});
    }
  }
}
