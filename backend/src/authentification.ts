import * as express from "express";
import * as jwt from "jsonwebtoken";

export function expressAuthentication(
  request: express.Request,
  securityName: string,
  scopes?: string[]
): Promise<any> {
  if (securityName === "jwt") {
    const token =
      request.body.token ||
      request.query.token ||
      request.headers["x-access-token"];

    return new Promise((resolve, reject) => {
      if (!token) {
        reject(new jwt.JsonWebTokenError("No token provided"));
      }
      jwt.verify(token, process.env.BACKEND_TOKEN_KEY, (err: any, decoded: any) => {
        if (err) {
          reject(err);
        } else {
          // Check if JWT contains all required scopes
          for (const scope of scopes) {
            if (!decoded.scopes.includes(scope)) {
              reject(new jwt.JsonWebTokenError("JWT does not contain required scope."));
            }
          }
          resolve(decoded);
        }
      });
    });
  }
}
