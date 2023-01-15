import nodemailer  from 'nodemailer';
import { sendOTP } from './mail';
import { expect } from 'chai';
import 'mocha';

describe('mail.ts - Sending emails', () => {

  it('Send test email using Ethereal', async () => {

    const account = await nodemailer.createTestAccount()
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
    expect(info.response).to.include('Accepted');
  })

  it('Send test email fake smtp server', async () => {
    const res = await sendOTP("recipient@example.com")
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    expect(res).to.be.true;
  })
})
