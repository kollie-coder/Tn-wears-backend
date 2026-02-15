'use strict';

module.exports = {
  async send(ctx) {
    try {
      const { email } = ctx.request.body;

      if (!email) {
        return ctx.badRequest('Email is required');
      }

      // Find the user
      const user = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { email },
      });

      if (!user) {
        return ctx.notFound('User not found');
      }

      // Generate verification code
      const code = Math.floor(100000 + Math.random() * 900000).toString();

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

      console.log('=== EMAIL DEBUG INFO ===');
      console.log('Sending to:', email);
      console.log('From:', process.env.BREVO_DEFAULT_FROM);
      console.log('SMTP User:', process.env.BREVO_SMTP_USERNAME);
      console.log('Has SMTP Password:', !!process.env.BREVO_SMTP_PASSWORD);

      // Send email with error catching
      try {
        await strapi.plugin('email').service('email').send({
          to: email,
          from: process.env.BREVO_DEFAULT_FROM,
          subject: 'Your Verification Code',
          text: textTemplate,
          html: htmlTemplate,
        });
        console.log('✅ Email sent successfully');
      } catch (emailError) {
        console.error('❌ EMAIL SEND ERROR:', emailError);
        console.error('Error details:', emailError.message);
        console.error('Error stack:', emailError.stack);
        throw emailError; // Re-throw to be caught by outer catch
      }

      // Update the user with the verification code
      await strapi.db.query('plugin::users-permissions.user').update({
        where: { id: user.id },
        data: {
          verificationCode: code,
          verificationCodeExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
        },
      });

      return ctx.send({ message: 'Verification code sent.' });

    } catch (error) {
      console.error('=== CONTROLLER ERROR ===');
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      return ctx.internalServerError({
        message: 'Failed to send verification code',
        error: error.message,
      });
    }
  }
};