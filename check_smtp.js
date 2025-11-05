const nodemailer = require('nodemailer');

// SMTP configuration
const smtpConfig = {
    host: 'live.smtp.mailtrap.io',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: 'api',
        pass: '0eb65d1a54733546ab6b989cc9eaf2de'
    }
};

// Create transporter
const transporter = nodemailer.createTransport(smtpConfig);

// Function to check SMTP connection
async function checkSMTP() {
    try {
        // Verify connection
        await transporter.verify();
        console.log('SMTP connection is working!');
    } catch (error) {
        console.error('SMTP connection failed:', error.message);
    }
}

// Run the check
checkSMTP();