const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    this.from = process.env.EMAIL_FROM || 'noreply@akaleta.ng';
    this.adminEmail = process.env.ADMIN_EMAIL || 'admin@akaleta.ng';
  }

  async _send(to, subject, html) {
    if (!process.env.SMTP_USER || process.env.SMTP_USER === 'your_email@gmail.com') {
      console.log(`[Email] Would send to ${to}: ${subject}`);
      return;
    }
    await this.transporter.sendMail({ from: this.from, to, subject, html });
  }

  async sendVerificationEmail(email, name, token) {
    const link = `${process.env.FRONTEND_URL}/verify-email/${token}`;
    await this._send(email, 'Verify your AKALETA account', `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0f;color:#fff;padding:40px;border-radius:12px">
        <h1 style="color:#00ff9d">Welcome to AKALETA, ${name}!</h1>
        <p>Thank you for joining Nigeria's premier sign language translator platform.</p>
        <p>Please verify your email address by clicking the button below:</p>
        <a href="${link}" style="display:inline-block;background:#00ff9d;color:#000;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;margin:20px 0">
          Verify Email Address
        </a>
        <p style="color:#666;font-size:12px">This link expires in 24 hours. If you didn't create an account, ignore this email.</p>
      </div>
    `);
  }

  async sendPasswordResetEmail(email, name, token) {
    const link = `${process.env.FRONTEND_URL}/reset-password/${token}`;
    await this._send(email, 'Reset your AKALETA password', `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0f;color:#fff;padding:40px;border-radius:12px">
        <h1 style="color:#00ff9d">Password Reset</h1>
        <p>Hi ${name}, we received a request to reset your password.</p>
        <a href="${link}" style="display:inline-block;background:#00ff9d;color:#000;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;margin:20px 0">
          Reset Password
        </a>
        <p style="color:#666;font-size:12px">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
      </div>
    `);
  }

  async sendSupportEmail({ name, email, subject, message }) {
    await this._send(this.adminEmail, `[AKALETA Support] ${subject}`, `
      <div style="font-family:Arial,sans-serif">
        <h2>New Support Request</h2>
        <p><strong>From:</strong> ${name} (${email})</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
      </div>
    `);
    // Auto-reply to user
    await this._send(email, 'We received your message - AKALETA Support', `
      <div style="font-family:Arial,sans-serif;background:#0a0a0f;color:#fff;padding:40px">
        <h2 style="color:#00ff9d">We got your message, ${name}!</h2>
        <p>Thank you for contacting AKALETA support. We'll respond within 24 hours.</p>
        <p><strong>Your message:</strong> ${message.substring(0, 200)}...</p>
      </div>
    `);
  }

  async sendBugReport({ title, description, steps, browser, userId }) {
    await this._send(this.adminEmail, `[AKALETA Bug] ${title}`, `
      <div style="font-family:Arial,sans-serif">
        <h2>Bug Report</h2>
        <p><strong>Title:</strong> ${title}</p>
        <p><strong>User ID:</strong> ${userId || 'Anonymous'}</p>
        <p><strong>Browser:</strong> ${browser || 'Unknown'}</p>
        <p><strong>Description:</strong> ${description}</p>
        <p><strong>Steps to Reproduce:</strong> ${steps || 'Not provided'}</p>
      </div>
    `);
  }
}

module.exports = new EmailService();
