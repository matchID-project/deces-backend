import * as express from "express";
import * as jwt from "jsonwebtoken";

export function expressAuthentication(
  request: express.Request,
  securityName: string,
  scopes?: string[]
): Promise<any> {
  if (securityName === "jwt") {
    const authHeader = request.headers.Authorization || request.headers.authorization;

    return new Promise((resolve, reject) => {
      if (!authHeader) {
        reject(new jwt.JsonWebTokenError("No token provided"));
      }
      let token
      if (Array.isArray(authHeader)) {
        token = authHeader[0].split(' ')[1];
      } else {
        token = authHeader.split(' ')[1];
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
