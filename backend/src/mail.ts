import nodemailer  from 'nodemailer';
import { ReviewStatus, sendOTPResponse } from './models/entities';
import loggerStream from './logger';
import crypto from 'crypto';
import { readFileSync } from 'fs';

let disposableMails: string[] = [];

try {
  disposableMails = readFileSync('data/disposable-mail.txt','utf8').split("\n");
} catch(e) {
  // eslint-disable-next-line no-console
  console.log('Failed loading disposable email',e);
}

const mailConfig = {
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  tls: {
    rejectUnauthorized: process.env.SMTP_TLS_SELFSIGNED ? false : true,
  },
 };
const transporter = nodemailer.createTransport(mailConfig);

const log = (json:any) => {
    loggerStream.write(JSON.stringify({
      "backend": {
        "server-date": new Date(Date.now()).toISOString(),
        ...json
      }
    }));
}

const OTP:any = {};

const generateOTP = (email: string) => {
    const digits = '0123456789';
    let tmp = '';
    for (let i = 0; i < 6; i++ ) {
        tmp += digits[Math.floor(Math.random() * 10)];
    }
    OTP[email] = tmp;
    setTimeout(() => {delete OTP[email]}, 600000);
}

export const sendOTP = async (email: string): Promise<sendOTPResponse> => {
    try {
      const provider = email.split("@")[1].toLowerCase();
      if (disposableMails.includes(provider)) {
        return {
          msg: "Le courriel fourni appartient à un fournisseur d'addresses temporaires",
          valid: false
        };
      } else {
        generateOTP(email);
        const hash = crypto.createHash('sha256').update(email).digest('hex').substring(0, 16)
        await transporter.sendMail({
            subject: `Validez votre identité - ${process.env.APP_DNS} - ${hash}`,
            text: `Votre code, valide 10 minutes: ${OTP[email] as string}`,
            from: process.env.API_EMAIL,
            to: `${email}`,
        } as any);
        return {
          msg: "Un code vous a été envoyé à l'adresse indiquée",
          valid: true
        };
      }
    } catch (err) {
        log({
            error: "SendOTP error",
            details: err
        });
        return {
          msg: `Erreur lors de l'envoi du code par mail`,
          valid: false
        };
    }
}

export const validateOTP = (email:string,otp:string): boolean => {
    if (otp && (OTP[email] === otp)) {
        delete OTP[email];
        return true;
    }
    return false;
}

export const sendUpdateConfirmation = async (email:string, status: ReviewStatus, rejectMsg: string, id: string): Promise<boolean> => {
    try {
        const message: any = {
            from: process.env.API_EMAIL,
            to: `${email}`,
        }
        if (status === 'validated') {
            message.subject = `Suggestion validée ! - ${process.env.APP_DNS}`;
            message.attachment = { data: `<html style="font-family:Helvetica;">
            <h4> Merci de votre contibution !</h4>
            Votre proposition de correction a été acceptée.<br>
            Retrouvez <a href="https://${process.env.APP_DNS}/id/${id}"> la fiche modifiée </a>.<br>
            <br>
            Vous pouvez à tout moment <a href="https://${process.env.APP_DNS}/edits">revenir sur vos contributions</a>.<br>
            <br>
            l'équipe matchID
            </html>
            `, alternative: true};
        } else if (status === 'rejected') {
            message.subject = `Suggestion incomplète - ${process.env.APP_DNS}`;
            message.attachment = { data: `<html style="font-family:Helvetica;">
            Nous vous remercions de votre contribution,<br>
            <br>
            Néanmoins les éléments fournis ne nous ont pas permis de retenir votre proposition à ce stade.<br>
            ${rejectMsg ? '<br>' + rejectMsg + '<br>' : ''}<br>
            Vous pourrez de nouveau soumettre une nouvelle proposition sur la fiche: <a href="https://${process.env.APP_DNS}/edits#${id}"></a>.<br>
            <br>
            l'équipe matchID
            </html>
            `, alternative: true};
        }
        await transporter.sendMail(message);
        return true;
    } catch (err) {
        return false;
    }
}
