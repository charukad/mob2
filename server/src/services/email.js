const nodemailer = require('nodemailer');

// Create transporter for sending emails
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

/**
 * Send verification email to user
 * @param {string} email - User's email address
 * @param {string} name - User's first name
 * @param {string} token - Verification token
 */
exports.sendVerificationEmail = async (email, name, token) => {
  // Construct verification URL
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

  // Email options
  const mailOptions = {
    from: `Sri Lanka Tourism Guide <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: 'Verify Your Email Address',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to Sri Lanka Tourism Guide!</h2>
        <p>Hello ${name},</p>
        <p>Thank you for registering with Sri Lanka Tourism Guide. To complete your registration, please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #1E88E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Email Address</a>
        </div>
        <p>If the button above doesn't work, you can also copy and paste the following link into your browser:</p>
        <p>${verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
        <p>If you did not sign up for an account, you can ignore this email.</p>
        <p>Best regards,<br>The Sri Lanka Tourism Guide Team</p>
      </div>
    `,
  };

  // Send email
  await transporter.sendMail(mailOptions);
};

/**
 * Send password reset email to user
 * @param {string} email - User's email address
 * @param {string} name - User's first name
 * @param {string} token - Reset token
 */
exports.sendPasswordResetEmail = async (email, name, token) => {
  // Construct reset URL
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

  // Email options
  const mailOptions = {
    from: `Sri Lanka Tourism Guide <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: 'Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>Hello ${name},</p>
        <p>You are receiving this email because you (or someone else) has requested to reset the password for your account.</p>
        <p>To reset your password, click on the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #1E88E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
        </div>
        <p>If the button above doesn't work, you can also copy and paste the following link into your browser:</p>
        <p>${resetUrl}</p>
        <p>This link will expire in 1 hour.</p>
        <p>If you did not request a password reset, please ignore this email and your password will remain unchanged.</p>
        <p>Best regards,<br>The Sri Lanka Tourism Guide Team</p>
      </div>
    `,
  };

  // Send email
  await transporter.sendMail(mailOptions);
};

/**
 * Send password change confirmation email
 * @param {string} email - User's email address
 * @param {string} name - User's first name
 */
exports.sendPasswordChangeConfirmation = async (email, name) => {
  // Email options
  const mailOptions = {
    from: `Sri Lanka Tourism Guide <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: 'Password Changed Successfully',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Changed Successfully</h2>
        <p>Hello ${name},</p>
        <p>Your password has been changed successfully.</p>
        <p>If you did not make this change, please contact our support team immediately.</p>
        <p>Best regards,<br>The Sri Lanka Tourism Guide Team</p>
      </div>
    `,
  };

  // Send email
  await transporter.sendMail(mailOptions);
};