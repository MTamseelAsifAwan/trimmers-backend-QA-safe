// src/services/emailService.js
const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

/**
 * EmailService provides methods for sending emails
 *
 * Required environment variables:
 * - SMTP_HOST: SMTP server host (default: smtp.gmail.com)
 * - SMTP_PORT: SMTP server port (default: 587)
 * - SMTP_USER: SMTP authentication username
 * - SMTP_PASSWORD: SMTP authentication password
 * - SMTP_SECURE: Use secure connection (default: false)
 */
class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: process.env.SMTP_PORT || 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD
            }
        });
    }

    /**
     * Send account credentials email to new barber/freelancer
     * @param {string} email - Recipient email
     * @param {string} password - Generated password
     * @param {string} userType - 'barber' or 'freelancer'
     * @param {string} firstName - User's first name
     * @param {string} lastName - User's last name
     * @returns {Promise<boolean>} - Success status
     */
    async sendAccountCredentials(email, password, userType, firstName, lastName) {
        try {
            const fullName = `${firstName} ${lastName}`.trim();
            const capitalizedUserType = userType.charAt(0).toUpperCase() + userType.slice(1);

            const mailOptions = {
                from: process.env.EMAIL_FROM,
                to: email,
                subject: `Welcome to Trimmers - Your ${capitalizedUserType} Account Credentials`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                        <h2 style="color: #333; text-align: center;">Welcome to Trimmers!</h2>

                        <p style="font-size: 16px; color: #555;">
                            Dear ${fullName},
                        </p>

                        <p style="font-size: 16px; color: #555;">
                            Your ${capitalizedUserType.toLowerCase()} account has been successfully created on the Trimmers platform.
                        </p>

                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                            <h3 style="color: #333; margin-top: 0;">Your Account Credentials:</h3>
                            <p style="margin: 10px 0;"><strong>Email:</strong> ${email}</p>
                            <p style="margin: 10px 0;"><strong>Password:</strong> <span style="font-family: monospace; background-color: #e9ecef; padding: 2px 6px; border-radius: 3px;">${password}</span></p>
                        </div>

                        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
                            <p style="margin: 0; color: #856404;">
                                <strong>⚠️ Security Notice:</strong> Please change your password after first login for security purposes.
                            </p>
                        </div>

                        <p style="font-size: 16px; color: #555;">
                            You can now log in to your account and start providing services on the Trimmers platform.
                        </p>

                        <p style="font-size: 16px; color: #555;">
                            If you have any questions, please contact our support team.
                        </p>

                        <p style="font-size: 16px; color: #555;">
                            Best regards,<br>
                            Trimmers Admin Team
                        </p>
                    </div>
                `
            };

            const info = await this.transporter.sendMail(mailOptions);
            logger.info(`Account credentials email sent successfully to ${email}: ${info.messageId}`);
            return true;
        } catch (error) {
            logger.error(`Failed to send account credentials email to ${email}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Test email connection
     * @returns {Promise<boolean>} - Connection status
     */
    async testConnection() {
        try {
            await this.transporter.verify();
            logger.info('Email service connection verified successfully');
            return true;
        } catch (error) {
            logger.error(`Email service connection failed: ${error.message}`);
            return false;
        }
    }
}

module.exports = new EmailService();