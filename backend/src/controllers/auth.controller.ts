import * as jwt from "jsonwebtoken";
import { Controller, Get, Post, Route, Tags, Body, Query } from 'tsoa';

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
    if (jsonToken.password === process.env.BACKEND_TOKEN_PASSWORD) {
      const accessToken = jwt.sign({...jsonToken, scopes: ['admin']}, process.env.BACKEND_TOKEN_KEY, { expiresIn: "1d" })
      return { 'access_token': accessToken }
    } else {
      this.setStatus(400);
      return { msg: "Wrong password" }
    }
  }

  /**
   * Authentification endpoint
   * @summary Route d'authentification
   * @param password User password
   */
  @Tags('Auth')
  @Get('')
  public authentificationGet(
    @Query() password: string,
  ): AccessToken {
    if (password === process.env.BACKEND_TOKEN_PASSWORD) {
      const accessToken = jwt.sign({password, scopes: ['admin']}, process.env.BACKEND_TOKEN_KEY, { expiresIn: "1d" })
      return { 'access_token': accessToken }
    } else {
      this.setStatus(400);
      return { msg: "Wrong password" }
    }
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
