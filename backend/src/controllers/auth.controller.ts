import * as jwt from "jsonwebtoken";
import { Controller, Get, Post, Route, Tags, Body, Query } from 'tsoa';

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

@Route('auth')
export class AuthController extends Controller {

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
