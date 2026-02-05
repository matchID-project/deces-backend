import nodemailer  from 'nodemailer';
import { ReviewStatus, sendOTPResponse } from './models/entities';
import loggerStream from './logger';
import crypto from 'crypto';
import { readFileSync } from 'fs';

interface MailConfig {
  host: string;
  port: number;
  tls: {
    rejectUnauthorized: boolean;
  };
  auth?: {
    user: string;
    pass: string;
  };
}

let disposableMails: string[] = [];

try {
  disposableMails = readFileSync(`${process.env.DISPOSABLE_MAIL}`,'utf8').split("\n");
} catch(e) {
  // eslint-disable-next-line no-console
  console.log('Failed loading disposable email',e);
}

const mailConfig: MailConfig = {
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  tls: {
    rejectUnauthorized: process.env.SMTP_TLS_SELFSIGNED ? false : true,
  },
 };

if (process.env.SMTP_PWD !== undefined) {
  mailConfig.auth = {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PWD
  }
}

const transporter = nodemailer.createTransport(mailConfig);

const log = (json:any) => {
    loggerStream.write(JSON.stringify({
      "backend": {
        "server-date": new Date(Date.now()).toISOString(),
        ...json
      }
    }));
}

interface OTPEntry {
  code: string;
  lastSendTime?: number;
  recentSendCount: number;
}

const OTP: Record<string, OTPEntry> = {};
const OTP_RATE_LIMIT_MS = 60000; // 1 minute base rate limit
const OTP_EXPIRE_MS = 6 * 60 * 60 * 1000; // 6 hours
const OTP_EXPIRE_TOLERANCE_MS = 60 * 1000; // 60 seconds

const scheduleOtpExpiry = (email: string, expectedLastSendTime: number) => {
    setTimeout(() => {
      const entry = OTP[email];
      if (!entry?.lastSendTime) {
        return;
      }
      const delta = Math.abs(entry.lastSendTime - expectedLastSendTime);
      const age = Date.now() - entry.lastSendTime;
      if (
        delta <= OTP_EXPIRE_TOLERANCE_MS &&
        age >= OTP_EXPIRE_MS - OTP_EXPIRE_TOLERANCE_MS
      ) {
        delete OTP[email];
      }
    }, OTP_EXPIRE_MS);
}

const generateOTP = (email: string) => {
    const digits = '0123456789';
    let tmp = '';
    for (let i = 0; i < 6; i++ ) {
        tmp += digits[Math.floor(Math.random() * 10)];
    }
    const prev = OTP[email];
    OTP[email] = {
      code: tmp,
      lastSendTime: prev?.lastSendTime,
      recentSendCount: prev?.recentSendCount ?? 0
    };
}

export const sendOTP = async (email: string): Promise<sendOTPResponse> => {
    try {
      const provider = email.split("@")[1].toLowerCase();
      if (disposableMails.includes(provider)) {
        return {
          msg: "Le courriel fourni appartient à un fournisseur d'addresses temporaires",
          valid: false
        };
      } else if (email in OTP && OTP[email].lastSendTime) {
        const timeSinceLastSend = Date.now() - OTP[email].lastSendTime;
        const effectiveCount = Math.max(0, OTP[email].recentSendCount - 1);
        const rateLimit = OTP_RATE_LIMIT_MS * Math.pow(2, effectiveCount);

        if (timeSinceLastSend < rateLimit) {
          const secondsLeft = Math.ceil((rateLimit - timeSinceLastSend) / 1000);
          const maxSecondsLeft = Math.ceil(OTP_EXPIRE_MS / 1000);
          const clampedSecondsLeft = Math.min(secondsLeft, maxSecondsLeft);
          if (clampedSecondsLeft > 120) {
            const minutesLeft = Math.ceil(clampedSecondsLeft / 60);
            return {
              msg: `Veuillez attendre ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''} avant de demander à nouveau un code`,
              valid: false
            };
          }
          return {
            msg: `Veuillez attendre ${clampedSecondsLeft} seconde${clampedSecondsLeft > 1 ? 's' : ''} avant de demander à nouveau un code`,
            valid: false
          };
        }
      }
      generateOTP(email);
      const hash = crypto.createHash('sha256').update(email).digest('hex').substring(0, 16)
      await transporter.sendMail({
          subject: `Validez votre identité - ${process.env.APP_DNS} - ${hash}`,
          text: `Votre code, valide 6 heures: ${OTP[email].code}`,
          from: process.env.API_EMAIL,
          to: `${email}`,
      } as any);
      // Only increment recentSendCount after successful mail send
      OTP[email].lastSendTime = Date.now();
      scheduleOtpExpiry(email, OTP[email].lastSendTime);
      OTP[email].recentSendCount++;
      return {
        msg: "Un code vous a été envoyé à l'adresse indiquée",
        valid: true
      };
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
    if (otp && OTP[email] && (OTP[email].code === otp)) {
        delete OTP[email];
        return true;
    }
    return false;
}

export const sendJobUpdate = async (email:string, content: string, jobId: string): Promise<boolean> => {
    try {
        const message: any = {
            from: process.env.API_EMAIL,
            to: `${email}`,
        }
        message.subject = `Traitement sur un fichier - ${process.env.APP_DNS}`;
        message.text = `${content ? 'Traitement fichier: ' + content : ''}\nVous pouvez consulter le status du traitement <a href="${process.env.APP_URL}/link?job=${jobId}"></a>ici.<br>`
        message.html = `<html style="font-family:Helvetica;">
              <h4> Traitement d'un fichier </h4>
              Vous avez lancé une tache d'appariement,<br>
              <br>
              ${content ? '<br>' + content + '<br>' : ''}<br>
              Vous pouvez consulter le status du traitement <a href="${process.env.APP_URL}/link?job=${jobId}">en utilisant ce lien</a>.<br>
              <br>
              l'équipe matchID
              </html>
              `
        await transporter.sendMail(message);
        return true;
    } catch (err) {
        return false;
    }
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
            Retrouvez <a href="${process.env.APP_URL}/id/${id}"> la fiche modifiée </a>.<br>
            <br>
            Vous pouvez à tout moment <a href="${process.env.APP_URL}/edits">revenir sur vos contributions</a>.<br>
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
            Vous pourrez de nouveau soumettre une nouvelle proposition sur la fiche <a href="${process.env.APP_URL}/edits#${id}">ici</a>.<br>
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
