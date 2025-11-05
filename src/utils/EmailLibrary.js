
//Mailing Service

const nodemailer = require("nodemailer");

/**
 * @author TARasti
 * This function is used to initialize mail service
 * @returns 
 */
const initializeMailService = () => {
    try {
        const config = {
            host: process.env.MAIL_HOST ? process.env.MAIL_HOST : "smtp.office365.com",
            port: process.env.MAIL_PORT ? process.env.MAIL_PORT : 587,
            secure: process.env.MAIL_SECURE ? process.env.MAIL_SECURE === 'true' ? true : false : false,
            ...(process.env.MAIL_USER && process.env.MAIL_PASS ? {
                auth: {
                    user: process.env.MAIL_USER ? process.env.MAIL_USER : null,
                    pass: process.env.MAIL_PASS ? process.env.MAIL_PASS : null
                },
            } : {})
        }
        const transporter = nodemailer.createTransport(config);
        return transporter;
    } catch (err) {
        throw new Error("Following error occured in inilializing mail service: ", err);
    }
}

/**
 * @author TARasti
 * This function verify email connection
 * @returns 
 */
const verifyEmailConnection = async () => {
    try {
        const transporter = initializeMailService();
        return await transporter.verify();
    } catch (err) {
        console.error({ err });
        return false;
    }
}

/**
 * This function send email
 * @author TARasti
 * @param {*} to 
 * @param {*} subject 
 * @param {*} body 
 * @param {*} attachments 
 * @param {*} from 
 * @returns 
 */
const sendEmail = async (to = '', from= '', subject = '', body = '', attachments = []) => {
    try {
        if (to && subject && body && from) {
            const transporter = await initializeEmailClient();
            transporter.sendMail({
                from: from, 
                sender: from,
                to,
                subject,
                html: body,
                attachments: attachments,
            }, (error, success) => {
                if (error) {
                    console.log({ error });
                }
            });
            return true;
        } else {
            throw new Error("'to', 'from', 'body' and 'subject' is required.");
        }
    } catch (err) {
        throw new Error(err);
    }
}


module.exports = {
    verifyEmailConnection,
    sendEmail,
}