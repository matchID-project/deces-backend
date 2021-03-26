import { SMTPClient } from 'emailjs';

const client = new SMTPClient({
    host: '192.168.1.15',
    port: 9025
});

const OTP:any = {};

const generateOTP = (email: string) => {
    const digits = '0123456789';
    let tmp = '';
    for (let i = 0; i < 6; i++ ) {
        tmp += digits[Math.floor(Math.random() * 10)];
    };
    OTP[email] = tmp;
    setTimeout(() => {delete OTP[email]}, 600000);
}

export const sendOTP = async (email: string) => {
    try {
        generateOTP(email);
        const message = await client.sendAsync({
            subject: 'Validez votre identité - deces.matchid.io',
            text: `Votre code, valide 10 minutes: ${OTP[email] as string}`,
            from: 'matchid.project@gmail.com',
            to: `${email}`,
            // bcc: 'matchid.project@gmail.com'
        } as any);
        return true;
    } catch (err) {
        return false;
    }
}

export const validateOTP = (email:string,otp:string) => {
    if (otp && (OTP[email] === otp)) {
        delete OTP[email];
        return true;
    }
    return false;
}