import * as jwt from "jsonwebtoken";
import {Body, Controller, Get, Post, Route, Security, Tags, Header} from 'tsoa';
import {userDB} from '../userDB';
import crypto from 'crypto';
import { validateOTP, sendOTP } from '../mail';

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
  public register(
    @Body() register: Register
  ): any {
    try {
      sendOTP(register.user);
      return { msg: "Check your mail and auth with OTP" };
    } catch(e) {
      this.setStatus(422);
      return { msg: "Coudn't send mail"}
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
        return { 'access_token': accessToken }
      }
    } else if ((Object.keys(userDB).indexOf(jsonToken.user)>=0) && (userDB[jsonToken.user] === crypto.createHash('sha256').update(jsonToken.password).digest('hex'))) {
      const accessToken = jwt.sign({...jsonToken, scopes: ['user']}, process.env.BACKEND_TOKEN_KEY, { expiresIn: "30d" })
      return { 'access_token': accessToken }
    } else if (validateOTP(jsonToken.user,jsonToken.password)) {
      const accessToken = jwt.sign({...jsonToken, scopes: ['user']}, process.env.BACKEND_TOKEN_KEY, { expiresIn: "30d" })
      return { 'access_token': accessToken }
    }
    this.setStatus(401);
    return { msg: "Wrong username or password"}
  }

  /**
   * Authentification confirmation endpoint
   * Checks if jwt is valid
   * @summary Route de vérification de validité de session
   */
  @Security('jwt',['user'])
  @Tags('Auth')
  @Get('/auth')
  public checkAuth(
    @Header('Authorization') Authorization?: string,
    @Header('authorization') authorization?: string
  ): any {
    const authHeader = Authorization || authorization;
    const token = authHeader.split(' ')[1];
    if (token) {
      const decoded: any = jwt.verify(token, process.env.BACKEND_TOKEN_KEY)
      return {
        msg: "jwt is valid",
        created_at: new Date(decoded.iat * 1000),
        expiration_date: new Date(decoded.exp * 1000)
      }
    } else {
      return { msg: "jwt is valid, but token info found"}
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
  'access_token'?: string;
  msg?: string
}
