'use strict';

const crypto = require('crypto');

module.exports = {
  async resend(ctx) {
    const { email } = ctx.request.body;

    if (!email) {
      return ctx.badRequest('Email is required');
    }

    const user = await strapi.entityService.findMany('plugin::users-permissions.user', {
      filters: { email },
      limit: 1,
    });

    if (!user || user.length === 0) {
      return ctx.badRequest('User not found');
    }

    const currentUser = user[0];

    const now = Date.now();
    const expiresAt = currentUser.verificationCodeExpiresAt
      ? new Date(currentUser.verificationCodeExpiresAt).getTime()
      : 0;

    if (expiresAt > now) {
      const secondsLeft = Math.ceil((expiresAt - now) / 1000);
      return ctx.badRequest(`Please wait ${secondsLeft} seconds before requesting a new code.`);
    }

    // Generate a 6-digit code
    const code = crypto.randomInt(100000, 999999).toString();

    // Set expiry to 5 minutes from now
    const verificationCodeExpiresAt = new Date(now + 5 * 60 * 1000); // 5 minutes


    // HTML email template
    const htmlTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <h1 style="color: #333333; font-size: 24px; margin-bottom: 20px; text-align: center; border-bottom: 3px solid #4CAF50; padding-bottom: 15px;">
            Verification Code
          </h1>
          
          <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
            Hello,
          </p>
          
          <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
            We received a request to verify your account. Please use the verification code below:
          </p>
          
          <!-- Verification Code Display -->
          <div style="text-align: center; margin: 35px 0;">
            <div style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px 40px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <span style="color: #ffffff; font-size: 32px; font-weight: bold; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                ${code}
              </span>
            </div>
          </div>
          
          <p style="color: #888888; font-size: 14px; line-height: 1.6; text-align: center; margin: 25px 0;">
            This code will expire in <strong>5 minutes</strong>
          </p>
          
          <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 25px 0; border-radius: 4px;">
            <p style="color: #856404; font-size: 14px; line-height: 1.6; margin: 0;">
              <strong>⚠️ Security Note:</strong> Never share this code with anyone. Our team will never ask for your verification code.
            </p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #eeeeee; margin: 30px 0;">
          
          <p style="color: #888888; font-size: 13px; line-height: 1.6; margin-bottom: 5px;">
            If you didn't request this code, please ignore this email or contact our support team.
          </p>
          
          <p style="color: #555555; font-size: 14px; line-height: 1.6; margin-top: 20px;">
            Best regards,<br>
            <strong>Your Team</strong>
          </p>
          
        </div>
        
        <p style="color: #999999; font-size: 12px; text-align: center; margin-top: 20px; line-height: 1.5;">
          This is an automated message, please do not reply to this email.
        </p>
      </div>
    `;

    // Plain text fallback
    const textTemplate = `
      Verification Code
      
      Hello,
      
      We received a request to verify your account. Please use the verification code below:
      
      ${code}
      
      This code will expire in 5 minutes.
      
      Security Note: Never share this code with anyone. Our team will never ask for your verification code.
      
      If you didn't request this code, please ignore this email or contact our support team.
      
      Best regards,
      Your Team
    `;

    await strapi.entityService.update('plugin::users-permissions.user', currentUser.id, {
      data: {
        verificationCode: code,
        verificationCodeExpiresAt,
      },
    });

    // Send email
    await strapi.plugin('email').service('email').send({
      to: email,
      from: process.env.BREVO_DEFAULT_FROM,
      subject: 'Your Verification Code',
      // text: `Your verification code is ${code}`,
      text: textTemplate,
      html: htmlTemplate,
    });

    return ctx.send({ message: 'Verification code resent successfully.' });
  },
};
