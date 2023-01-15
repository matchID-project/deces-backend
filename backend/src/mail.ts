import nodemailer  from 'nodemailer';
import { ReviewStatus } from './models/entities';

const mailConfig = {
     host: process.env.SMTP_HOST,
     port: Number(process.env.SMTP_PORT),
 };
const transporter = nodemailer.createTransport(mailConfig);

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

export const sendOTP = async (email: string): Promise<boolean> => {
    try {
        generateOTP(email);
        await transporter.sendMail({
            subject: `Validez votre identité - ${process.env.APP_DNS}`,
            text: `Votre code, valide 10 minutes: ${OTP[email] as string}`,
            from: process.env.API_EMAIL,
            to: `${email}`,
        } as any);
        return true;
    } catch (err) {
        return false;
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
