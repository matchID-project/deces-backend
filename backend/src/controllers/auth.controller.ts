import * as jwt from "jsonwebtoken";
import {Body, Controller, Get, Post, Route, Security, Tags, Header, Query} from 'tsoa';
import { sendOTPResponse } from '../models/entities';
import {userDB} from '../userDB';
import crypto from 'crypto';
import { validateOTP, sendOTP } from '../mail';
import loggerStream from '../logger';

const log = (json:any) => {
    loggerStream.write(JSON.stringify({
      "backend": {
        "server-date": new Date(Date.now()).toISOString(),
        ...json
      }
    }));
}

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentification routes
 */
@Route('')
export class AuthController extends Controller {
  /**
   * Registration endpoint
   * @summary Route d'enrôlement
   */
  @Tags('Auth')
  @Post('/register')
  public async register(
    @Body() register: Register
  ): Promise<sendOTPResponse> {
    try {
      return await sendOTP(register.user);
    } catch(e) {
      this.setStatus(422);
      return {
        valid: false,
        msg: "Coudn't send mail"
      }
    }
  }

  /**
   * Authentification endpoint
   * @summary Route d'authentification
   */
  @Tags('Auth')
  @Post('/auth')
  public auth(
    @Body() jsonToken: JsonToken
  ): AccessToken {
    if (jsonToken.user === process.env.BACKEND_TOKEN_USER) {
      // admin username may not be overrided through user db or any other mean
      if (jsonToken.password === process.env.BACKEND_TOKEN_PASSWORD) {
        const accessToken = jwt.sign({...jsonToken, scopes: ['admin','user']}, process.env.BACKEND_TOKEN_KEY, { expiresIn: "1d" })
        const decoded: any = jwt.verify(accessToken, process.env.BACKEND_TOKEN_KEY)
        return {
          msg: "jwt properly generated",
          access_token: accessToken,
          created_at: decoded.jti,
          expiration_date: decoded.exp.toString(),
          renewal_limit_date: (Number(decoded.jti) + 2592000 * 11).toString()
        }
      }
    } else if ((Object.keys(userDB).indexOf(jsonToken.user)>=0) && (userDB[jsonToken.user] === crypto.createHash('sha256').update(jsonToken.password).digest('hex'))) {
      const accessToken = jwt.sign({...jsonToken, scopes: ['user']}, process.env.BACKEND_TOKEN_KEY, { expiresIn: "30d", jwtid: Math.floor(Date.now() / 1000).toString()})
      const decoded: any = jwt.verify(accessToken, process.env.BACKEND_TOKEN_KEY)
      return {
          msg: "jwt properly generated",
          access_token: accessToken,
          created_at: decoded.jti,
          expiration_date: decoded.exp.toString(),
          renewal_limit_date: (Number(decoded.jti) + 2592000 * 11).toString()
      }
    } else if (validateOTP(jsonToken.user,jsonToken.password)) {
      const accessToken = jwt.sign({...jsonToken, scopes: ['user']}, process.env.BACKEND_TOKEN_KEY, { expiresIn: "30d", jwtid: Math.floor(Date.now() / 1000).toString() })
      const decoded: any = jwt.verify(accessToken, process.env.BACKEND_TOKEN_KEY)
      return {
          msg: "jwt properly generated",
          access_token: accessToken,
          created_at: decoded.jti,
          expiration_date: decoded.exp.toString(),
          renewal_limit_date: (Number(decoded.jti) + 2592000 * 11).toString()
      }
    }
    this.setStatus(401);
    return { msg: "Wrong username or password"}
  }

  /**
   * Authentification confirmation endpoint
   * Checks if jwt is valid
   * @summary Route de vérification de validité de session
   * @param refresh Renouveler une token déjà valide
   */
  @Security('jwt',['user'])
  @Tags('Auth')
  @Get('/auth')
  public checkAuth(
    @Header('Authorization') Authorization?: string,
    @Header('authorization') authorization?: string,
    @Query() refresh?: string
  ): AccessToken {
    const authHeader = Authorization || authorization;
    const token = authHeader.split(' ')[1];
    if (refresh && token) {
      try {
        let decoded: any = jwt.verify(token, process.env.BACKEND_TOKEN_KEY)
        const now = Math.floor(Date.now() / 1000)
        // refresh until 11 month of creation
        const oneYearAftercreation = Number(decoded.jti) + 2592000 * 11;
        if (now < oneYearAftercreation) {
          delete decoded.exp;
          delete decoded.iat;
          const accessToken = jwt.sign(decoded, process.env.BACKEND_TOKEN_KEY, { expiresIn: "30d" });
          decoded = jwt.verify(accessToken, process.env.BACKEND_TOKEN_KEY)
          return {
            msg: "jwt has been properly renewed",
            access_token: accessToken,
            created_at: decoded.jti,
            expiration_date: decoded.exp.toString(),
            renewal_limit_date: oneYearAftercreation.toString()
          }
        } else {
          return { msg: "Token can't be refreshed for more than 1 year" }
        }
      } catch (e) {
        log({
            error: "Refresh token error",
            details: e
        });
        this.setStatus(401);
        return { msg: "Wrong token"}
      }
    } else {
      const decoded: any = jwt.verify(token, process.env.BACKEND_TOKEN_KEY)

      return {
        msg: "jwt is valid",
        created_at: decoded.jti,
        expiration_date: decoded.exp.toString(),
        renewal_limit_date: (Number(decoded.jti) + 2592000 * 11).toString()
      }
    }
  }

}

/**
 * User password
 * @tsoaModel
 * @example
 * {
 *   "user": "user1@gmail.com",
 *   "password": "secret"
 * }
 */
interface JsonToken {
  user: string;
  password: string;
}

/**
 * Register
 * @tsoaModel
 * @example
 * {
 *   "user": "user1@gmail.com"
 * }
 */
interface Register {
  user: string;
}

/**
 * Access token
 * @tsoaModel
 * @example
 * {
 *   "access_token": "baikoh9Xeecei5EethauNi"
 * }
 */
interface AccessToken {
  access_token?: string;
  msg?: string
  created_at?: string;
  expiration_date?: string;
  renewal_limit_date?: string;
}
