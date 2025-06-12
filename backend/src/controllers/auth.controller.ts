import * as jwt from "jsonwebtoken";
import {Body, Controller, Get, Post, Route, Security, Tags, Header, Query} from 'tsoa';
import { sendOTPResponse } from '../models/entities';
import { sendAuth0OTP, verifyAuth0OTP, createApiKey, verifyAuth0Token } from '../auth0';
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
      return await sendAuth0OTP(register.user);
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
  public async auth(
    @Body() jsonToken: JsonToken
  ): Promise<AccessToken> {
    try {
      const token = await verifyAuth0OTP(jsonToken.user, jsonToken.password);
      return {
        msg: 'jwt properly generated',
        access_token: token.access_token,
        expiration_date: token.expires_in ? (Math.floor(Date.now() / 1000) + token.expires_in).toString() : undefined
      };
    } catch (e) {
      this.setStatus(401);
      return { msg: 'Wrong username or password' };
    }
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
  ): Promise<AccessToken> {
    const authHeader = Authorization || authorization;
    const token = authHeader.split(' ')[1];
    if (refresh) {
      this.setStatus(422);
      return Promise.resolve({ msg: "Token refresh handled by Auth0" });
    }
    return verifyAuth0Token(token)
      .then((decoded: any) => {
        return {
          msg: 'jwt is valid',
          expiration_date: decoded.exp?.toString()
        };
      })
      .catch(() => {
        this.setStatus(401);
        return { msg: 'Wrong token' };
      });
  }

  @Security('jwt',['user'])
  @Tags('Auth')
  @Post('/apikey')
  public async generateApiKey(@Body() body: { expiresIn: number }): Promise<any> {
    try {
      const token = await createApiKey(body.expiresIn);
      return token;
    } catch (e) {
      this.setStatus(422);
      return { msg: 'Api key generation failed' };
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
