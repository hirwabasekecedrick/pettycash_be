"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPasswordEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
// Configure the transporter with environment variables
const transporter = nodemailer_1.default.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});
const sendPasswordEmail = async (email, name, password) => {
    try {
        const info = await transporter.sendMail({
            from: `"PetitCashPro" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Your Account Password',
            text: `Hello ${name},\n\nYour wallet account has been created. Your password is: ${password}\n\nPlease keep it safe.`,
            html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #0f172a;">Welcome to PetitCashPro, ${name}!</h2>
          <p>Your wallet account has been created successfully.</p>
          <p>Here is your temporary password to enter your account:</p>
          <div style="padding: 15px; background-color: #f1f5f9; border-radius: 8px; font-size: 18px; font-weight: bold; letter-spacing: 1px; margin: 20px 0; text-align: center;">
            ${password}
          </div>
          <p>Please login and change your password as soon as possible.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
          <p style="font-size: 12px; color: #64748b;">This is an automated message, please do not reply.</p>
        </div>
      `,
        });
        console.log('Message sent: %s', info.messageId);
    }
    catch (error) {
        console.error('Error sending email:', error);
    }
};
exports.sendPasswordEmail = sendPasswordEmail;
