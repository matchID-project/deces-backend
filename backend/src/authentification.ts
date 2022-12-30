import * as express from "express";
import * as jwt from "jsonwebtoken";

const bannedIP: any = {};
const toBeBannedIP: any = {};

export const expressAuthentication = (
  request: express.Request,
  securityName: string,
  scopes?: string[]
): Promise<any> => {

  if (securityName === "jwt" || securityName === "tmp") {
    const authHeader = request.headers.Authorization || request.headers.authorization;
    const { ip } = request;
    return new Promise((resolve, reject) => {
      if (!authHeader) {
        if (securityName === "tmp") {
          if (bannedIP[ip]) {
            reject(new jwt.JsonWebTokenError(`No token provided and temporary anonymous usage expired, please register with email or wait ${(Number(process.env.BACKEND_TMP_WINDOW) / 3600).toFixed(0).toString()} hours`));
          } else {
            if (!toBeBannedIP[ip]) {
              toBeBannedIP[ip] = 1;
              setTimeout(() => {
                  toBeBannedIP[ip] = 0;
                  bannedIP[ip] = false;
              }, Number(process.env.BACKEND_TMP_WINDOW || "86400") * 1000);
            } else {
              toBeBannedIP[ip]++;
              if (toBeBannedIP[ip]>Number(process.env.BACKEND_TMP_MAX || "300")) {
                bannedIP[ip] = true;
                setTimeout(() => {
                  toBeBannedIP[ip] = 0;
                  bannedIP[ip] = false;
                }, Number(process.env.BACKEND_TMP_DURATION || "14400") * 1000);
              }
            }
            resolve({});
          }
        } else {
          reject(new jwt.JsonWebTokenError("No token provided"));
        }
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
