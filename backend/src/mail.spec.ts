import nodemailer  from 'nodemailer';
import { sendOTP } from './mail';
import { describe, expect, it } from 'vitest'

describe('mail.ts - Sending emails', () => {

  it('Send test email using Ethereal', async () => {
    try {
      const account = await nodemailer.createTestAccount()
      expect(account.user.length, `account not created: ${JSON.stringify(account)}`).greaterThan(0);
      const transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: account.user, // generated ethereal user
          pass: account.pass  // generated ethereal password
        }
      });
      const message = {
        from: 'Sender Name <sender@example.com>',
        to: 'Recipient <recipient@example.com>',
        subject: 'Nodemailer is unicode friendly ✔',
        text: 'Hello to myself!',
        html: '<p><b>Hello</b> to myself!</p>'
      };
      const info = await transporter.sendMail(message)
      expect(info.response, `mail not sended ${JSON.stringify(info)}`).to.include('Accepted');
    } catch (e) {
      throw new Error(e)
    }
  }, 10000);

  it('Send test email fake smtp server', async () => {
    let res: any;
    res = await sendOTP("recipient@example.com")
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    expect(res.valid).to.be.true;

    // Test rate limit: second send should fail with rate limit message
    res = await sendOTP("recipient@example.com")
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    expect(res.valid).to.be.false;
    expect(res.msg).to.include('attendre');
  })

  it('Send test email fake smtp server to a disposable address', async () => {
    const res = await sendOTP("recipient@xoxy.net")
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    expect(res.valid).to.be.false;
  })
})
