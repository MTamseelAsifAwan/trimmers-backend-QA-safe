require('dotenv').config();
const nodemailer = require('nodemailer');

const smtpConfig = {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
    },
    tls: {
        rejectUnauthorized: false
    }
};

async function testEmail() {
    try {
        const transporter = nodemailer.createTransport(smtpConfig);
        
        // Test email
        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: "test@example.com",
            subject: "Test Email",
            text: "This is a test email"
        });
        
        console.log('Test email sent successfully:', info);
    } catch (error) {
        console.error('Error sending email:', error);
    }
}

testEmail();