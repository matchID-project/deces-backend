import { Body, Controller, Post, Route, Security, Tags } from 'tsoa';
import { requestChallenge, validateChallenge, getWebhookStatus, deleteWebhook } from '../webhook';
import { WebhookRequest } from '../models/entities';

@Route('webhook')
export class WebhookValidationController extends Controller {
  @Security('jwt', ['user'])
  @Tags('Webhook')
  @Post('')
  public async webhook(
    @Body() body: WebhookRequest
  ): Promise<{ status: string; challenge?: string; msg?: string }> {
    switch (body.action) {
      case 'register':
        return requestChallenge(body.url);
      case 'challenge':
        return await validateChallenge(body.url);
      case 'status':
        return getWebhookStatus(body.url);
      case 'delete':
        return deleteWebhook(body.url);
      default:
        this.setStatus(400);
        return { status: 'error', msg: 'Invalid action' };
    }
  }
}
