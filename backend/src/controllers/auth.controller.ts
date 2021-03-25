import * as jwt from "jsonwebtoken";
import {Body, Controller, Post, Route, Tags} from 'tsoa';
import {userDB} from '../userDB';
import crypto from 'crypto';

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentification routes
 */
@Route('auth')
export class AuthController extends Controller {

  /**
   * Authentification endpoint
   * @summary Route d'authentification
   */
  @Tags('Auth')
  @Post('')
  public authentificationPost(
    @Body() jsonToken: JsonToken
  ): AccessToken {
    if (jsonToken.user === process.env.BACKEND_TOKEN_USER) {
      // admin username may not be overrided through user db or any other mean
      if (jsonToken.password === process.env.BACKEND_TOKEN_PASSWORD) {
        const accessToken = jwt.sign({...jsonToken, scopes: ['admin','user']}, process.env.BACKEND_TOKEN_KEY, { expiresIn: "1d" })
        return { 'access_token': accessToken }
      }
    } else if ((Object.keys(userDB).indexOf(jsonToken.user)>=0) && userDB[jsonToken.user] === crypto.createHash('sha256').update(jsonToken.password).digest('hex')) {
      const accessToken = jwt.sign({...jsonToken, scopes: ['user']}, process.env.BACKEND_TOKEN_KEY, { expiresIn: "1d" })
      return { 'access_token': accessToken }
    }
    this.setStatus(401);
    return { msg: "Wrong username or password"}
  }

}


/**
 * User password
 * @tsoaModel
 * @example
 * {
 *   "password": "secret"
 * }
 */
interface JsonToken {
  user: string;
  password: string;
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
