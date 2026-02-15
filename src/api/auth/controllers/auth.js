'use strict';

const axios = require('axios');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sanitize } = require('@strapi/utils');

module.exports = {
  async googleLogin(ctx) {
    const { access_token } = ctx.request.body;

    if (!access_token) {
      return ctx.badRequest('Missing access token');
    }

    try {
      // Get user info from Google
      const googleUser = await axios
        .get(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${access_token}`)
        .then(res => res.data);

      const email = googleUser.email;
      const username = email;
      const firstname = googleUser.given_name;
      const lastname = googleUser.family_name;

      if (!email) return ctx.badRequest('No email from Google');

      // Check if user exists
      const existingUser = await strapi.query('plugin::users-permissions.user').findOne({
        where: { email },
      });
      
      if (existingUser) {
        if (existingUser.provider === 'local') {
          return ctx.badRequest('This email is already registered. Please login with email and password.');
        }

         // Continue with existing Google user
        const jwt = strapi.plugin('users-permissions').service('jwt').issue({ id: existingUser.id });
        return ctx.send({ jwt, user: existingUser });
      }

      // Get "authenticated" role
      const authenticatedRole = await strapi
        .query('plugin::users-permissions.role')
        .findOne({ where: { type: 'authenticated' } });

      if (!authenticatedRole) {
        return ctx.internalServerError('Authenticated role not found');
      }


      // New user - create one
      // const newUser = await strapi.plugin('users-permissions').service('user').add({
      //   email,
      //   username,
      //   confirmed: true,
      //   isVerified: true,
      //   provider: 'google',
      //   firstname,
      //   lastname,
      //   role: authenticatedRole.id
      // });

      // 4️⃣ Create new user
      const createdUser = await strapi.plugin('users-permissions').service('user').add({
        email,
        username,
        confirmed: true,
        isVerified: true,
        provider: 'google',
        firstname,
        lastname,
        role: authenticatedRole.id,
      });

      // Immediately fetch populated user
      const newUser = await strapi.query('plugin::users-permissions.user').findOne({
        where: { id: createdUser.id },
        populate: ['role'],
      });

      // Create JWT
      const jwt = strapi.plugin('users-permissions').service('jwt').issue({ id: newUser.id });

      ctx.send({ jwt, user:newUser });

      
    } catch (err) {
      console.error(err);
      return ctx.internalServerError('Google login failed');
    }
  },


  // EMAIL CHANGE - INITIATE
  // ============================================
  async changeEmail(ctx) {
    const { email, currentEmail } = ctx.request.body;
    const user = ctx.state.user;

    // Check if user is authenticated
    if (!user) {
      return ctx.unauthorized('You must be logged in');
    }

    // Verify current email matches the user's actual email
    if (user.email !== currentEmail) {
      return ctx.badRequest('Current email does not match');
    }

    // Check if new email is the same as current
    if (user.email === email) {
      return ctx.badRequest('New email must be different from current email');
    }

    // Check if new email is already taken by another user
    const existingUser = await strapi
      .query('plugin::users-permissions.user')
      .findOne({ where: { email } });

    if (existingUser) {
      return ctx.badRequest('Email already in use');
    }

    // Generate 6-digit verification code
    const verificationCode = crypto.randomInt(100000, 999999).toString();
    const codeExpiry = new Date(Date.now() + 10 * 60 * 1000); // Expires in 10 minutes

    // Store pending email change in database
    await strapi.query('plugin::users-permissions.user').update({
      where: { id: user.id },
      data: {
        pendingEmail: email,
        emailVerificationCode: verificationCode,
        emailCodeExpiry: codeExpiry,
      },
    });

    // Send verification email
    try {
      await strapi.plugins['email'].services.email.send({
        to: email,
        from: process.env.BREVO_DEFAULT_FROM,
        subject: 'Verify Your New Email Address',
        text: `Your verification code is: ${verificationCode}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { 
                  font-family: Arial, sans-serif; 
                  line-height: 1.6; 
                  color: #333; 
                  margin: 0;
                  padding: 0;
                }
                .container { 
                  max-width: 600px; 
                  margin: 0 auto; 
                  padding: 20px; 
                }
                .header { 
                  background-color: #0d9488; 
                  color: white; 
                  padding: 20px; 
                  text-align: center; 
                  border-radius: 5px 5px 0 0; 
                }
                .content { 
                  background-color: #f9f9f9; 
                  padding: 30px; 
                  border-radius: 0 0 5px 5px; 
                }
                .code { 
                  font-size: 32px; 
                  font-weight: bold; 
                  color: #0d9488; 
                  text-align: center; 
                  padding: 20px; 
                  background: white; 
                  border-radius: 5px; 
                  letter-spacing: 5px;
                  margin: 20px 0;
                }
                .footer { 
                  text-align: center; 
                  margin-top: 20px; 
                  color: #666; 
                  font-size: 12px; 
                }
                .warning {
                  color: #d97706;
                  font-weight: bold;
                  margin-top: 15px;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Email Verification</h1>
                </div>
                <div class="content">
                  <p>Hello,</p>
                  <p>You've requested to change your email address. Please use the verification code below to complete the process:</p>
                  <div class="code">${verificationCode}</div>
                  <p class="warning">⚠️ This code will expire in 10 minutes.</p>
                  <p>If you didn't request this change, please ignore this email and your account will remain secure.</p>
                </div>
                <div class="footer">
                  <p>This is an automated message, please do not reply.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      });

      ctx.send({ 
        message: 'Verification code sent to new email',
        success: true 
      });
    } catch (error) {
      console.error('Email sending error:', error);
      
      // Rollback the pending email change if email fails to send
      await strapi.query('plugin::users-permissions.user').update({
        where: { id: user.id },
        data: {
          pendingEmail: null,
          emailVerificationCode: null,
          emailCodeExpiry: null,
        },
      });
      
      return ctx.badRequest('Failed to send verification email. Please try again.');
    }
  },


  async verifyEmailChange(ctx) {
  const { code, email } = ctx.request.body;
  const user = ctx.state.user;

  if (!user) {
    return ctx.unauthorized('You must be logged in');
  }

  const currentUser = await strapi
    .query('plugin::users-permissions.user')
    .findOne({ where: { id: user.id } });

  if (!currentUser?.emailVerificationCode) {
    return ctx.badRequest('No pending email change request');
  }

  if (currentUser.emailVerificationCode !== code) {
    return ctx.badRequest('Invalid verification code');
  }

  if (currentUser.pendingEmail !== email) {
    return ctx.badRequest('Email does not match pending email change');
  }

  if (new Date() > new Date(currentUser.emailCodeExpiry)) {
    return ctx.badRequest('Verification code has expired');
  }

  const updatedUser = await strapi
    .query('plugin::users-permissions.user')
    .update({
      where: { id: user.id },
      data: {
        email: currentUser.pendingEmail,
        confirmed: true,
        isVerified: true,
        pendingEmail: null,
        emailVerificationCode: null,
        emailCodeExpiry: null,
      },
    });

  const sanitizedUser = await strapi.contentAPI.sanitize.output(
    updatedUser,
    strapi.getModel('plugin::users-permissions.user')
  );

  ctx.send({
    user: sanitizedUser,
    message: 'Email updated successfully',
    success: true,
  });
},


  // ============================================
  // EMAIL CHANGE - RESEND VERIFICATION CODE
  // ============================================
  async resendEmailVerification(ctx) {
    const { email } = ctx.request.body;
    const user = ctx.state.user;

    // Check if user is authenticated
    if (!user) {
      return ctx.unauthorized('You must be logged in');
    }

    // Fetch latest user data from database
    const currentUser = await strapi.query('plugin::users-permissions.user').findOne({
      where: { id: user.id },
    });

    // Verify there's a pending email change for this address
    if (currentUser.pendingEmail !== email) {
      return ctx.badRequest('No pending email change for this address');
    }

    // Generate new verification code
    const verificationCode = crypto.randomInt(100000, 999999).toString();
    const codeExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Update with new code
    await strapi.query('plugin::users-permissions.user').update({
      where: { id: user.id },
      data: {
        emailVerificationCode: verificationCode,
        emailCodeExpiry: codeExpiry,
      },
    });

    // Resend verification email
    try {
      await strapi.plugins['email'].services.email.send({
        to: email,
        from: process.env.BREVO_DEFAULT_FROM,
        subject: 'Verify Your New Email Address',
        text: `Your verification code is: ${verificationCode}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { 
                  font-family: Arial, sans-serif; 
                  line-height: 1.6; 
                  color: #333; 
                  margin: 0;
                  padding: 0;
                }
                .container { 
                  max-width: 600px; 
                  margin: 0 auto; 
                  padding: 20px; 
                }
                .header { 
                  background-color: #0d9488; 
                  color: white; 
                  padding: 20px; 
                  text-align: center; 
                  border-radius: 5px 5px 0 0; 
                }
                .content { 
                  background-color: #f9f9f9; 
                  padding: 30px; 
                  border-radius: 0 0 5px 5px; 
                }
                .code { 
                  font-size: 32px; 
                  font-weight: bold; 
                  color: #0d9488; 
                  text-align: center; 
                  padding: 20px; 
                  background: white; 
                  border-radius: 5px; 
                  letter-spacing: 5px;
                  margin: 20px 0;
                }
                .footer { 
                  text-align: center; 
                  margin-top: 20px; 
                  color: #666; 
                  font-size: 12px; 
                }
                .warning {
                  color: #d97706;
                  font-weight: bold;
                  margin-top: 15px;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Email Verification</h1>
                </div>
                <div class="content">
                  <p>Hello,</p>
                  <p>Here's your new verification code:</p>
                  <div class="code">${verificationCode}</div>
                  <p class="warning">⚠️ This code will expire in 10 minutes.</p>
                  <p>If you didn't request this change, please ignore this email and your account will remain secure.</p>
                </div>
                <div class="footer">
                  <p>This is an automated message, please do not reply.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      });

      ctx.send({ 
        message: 'Verification code resent',
        success: true 
      });
    } catch (error) {
      console.error('Email sending error:', error);
      return ctx.badRequest('Failed to send verification email. Please try again.');
    }
  },

   // TWO-FACTOR AUTHENTICATION - ENABLE
  // ============================================
  async enable2FA(ctx) {
    const { pin } = ctx.request.body;
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized('You must be logged in');
    }

    if (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      return ctx.badRequest('PIN must be exactly 6 digits');
    }

    try {
      // Hash the PIN for security
      const hashedPin = await bcrypt.hash(pin, 10);
      
      // Update user with 2FA enabled
      await strapi.query('plugin::users-permissions.user').update({
        where: { id: user.id },
        data: {
          twoFactorEnabled: true,
          twoFactorPin: hashedPin
        }
      });

      ctx.send({ 
        message: '2FA enabled successfully',
        success: true 
      });
    } catch (error) {
      console.error('2FA enable error:', error);
      return ctx.badRequest('Failed to enable 2FA. Please try again.');
    }
  },

  // ============================================
  // TWO-FACTOR AUTHENTICATION - CHANGE PIN
  // ============================================
  async change2FA(ctx) {
    const { oldPin, newPin } = ctx.request.body;
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized('You must be logged in');
    }

    if (!oldPin || !newPin) {
      return ctx.badRequest('Both old and new PINs are required');
    }

    if (newPin.length < 4 || !/^\d+$/.test(newPin)) {
      return ctx.badRequest('New PIN must be at least 4 digits');
    }

    try {
      // Fetch user with 2FA data
      const currentUser = await strapi.query('plugin::users-permissions.user').findOne({
        where: { id: user.id },
        select: ['id', 'twoFactorEnabled', 'twoFactorPin']
      });

      // Check if 2FA is enabled
      if (!currentUser.twoFactorEnabled || !currentUser.twoFactorPin) {
        return ctx.badRequest('2FA is not enabled for this account');
      }

      // Verify old PIN
      const isValidOldPin = await bcrypt.compare(oldPin, currentUser.twoFactorPin);
      
      if (!isValidOldPin) {
        return ctx.badRequest('Incorrect old PIN');
      }

      // Hash new PIN
      const hashedNewPin = await bcrypt.hash(newPin, 10);
      
      // Update PIN
      await strapi.query('plugin::users-permissions.user').update({
        where: { id: user.id },
        data: { twoFactorPin: hashedNewPin }
      });

      ctx.send({ 
        message: '2FA PIN changed successfully',
        success: true 
      });
    } catch (error) {
      console.error('2FA change error:', error);
      return ctx.badRequest('Failed to change 2FA PIN. Please try again.');
    }
  },

  // ============================================
  // TWO-FACTOR AUTHENTICATION - DISABLE
  // ============================================
  async disable2FA(ctx) {
    const { pin } = ctx.request.body;
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized('You must be logged in');
    }

    if (!pin) {
      return ctx.badRequest('PIN is required to disable 2FA');
    }

    try {
      // Fetch user with 2FA data
      const currentUser = await strapi.query('plugin::users-permissions.user').findOne({
        where: { id: user.id },
        select: ['id', 'twoFactorEnabled', 'twoFactorPin']
      });

      // Check if 2FA is enabled
      if (!currentUser.twoFactorEnabled || !currentUser.twoFactorPin) {
        return ctx.badRequest('2FA is not enabled for this account');
      }

      // Verify PIN
      const isValidPin = await bcrypt.compare(pin, currentUser.twoFactorPin);
      
      if (!isValidPin) {
        return ctx.badRequest('Incorrect PIN');
      }

      // Disable 2FA
      await strapi.query('plugin::users-permissions.user').update({
        where: { id: user.id },
        data: {
          twoFactorEnabled: false,
          twoFactorPin: null
        }
      });

      ctx.send({ 
        message: '2FA disabled successfully',
        success: true 
      });
    } catch (error) {
      console.error('2FA disable error:', error);
      return ctx.badRequest('Failed to disable 2FA. Please try again.');
    }
  },


// Add this to your auth controller (src/api/auth/controllers/auth.js):

async deleteAccount(ctx) {
  const user = ctx.state.user;

  if (!user) {
    return ctx.unauthorized('You must be logged in');
  }

  try {
    const userId = user.id;
    const timestamp = Date.now();

    // Soft delete - mark account as deleted and anonymize data
    await strapi.query('plugin::users-permissions.user').update({
      where: { id: userId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        // Anonymize personal information
        email: `deleted_${userId}_${timestamp}@deleted.com`,
        username: `deleted_user_${userId}_${timestamp}`,
        firstname: null,
        lastname: null,
        // Optionally clear other personal data
        blocked: true, // Prevent login
      }
    });

    ctx.send({
      message: 'Account marked for deletion successfully',
      success: true
    });
  } catch (error) {
    console.error('Delete account error:', error);
    return ctx.badRequest('Failed to delete account. Please try again.');
  }
}

  
};
