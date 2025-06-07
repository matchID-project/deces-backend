import { Body, Controller, Post, Route, Security, Tags } from 'tsoa';
import { requestChallenge, validateChallenge } from '../webhook';

@Route('webhook')
export class WebhookValidationController extends Controller {
  @Security('jwt', ['user'])
  @Tags('Webhook')
  @Post('')
  public async webhook(
    @Body() body: { url: string; challenge?: 'get' | 'validate' }
  ): Promise<{ status: string; challenge?: string; message?: string }> {
    if (body.challenge === 'validate') {
      return await validateChallenge(body.url);
    }
    return requestChallenge(body.url);
  }
}
