'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  async register(ctx) {
    const response = await strapi
      .plugin('users-permissions')
      .controllers.auth.register(ctx);

    const { email } = ctx.request.body;

    // Generate a 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Save code to user
    await strapi.entityService.update('plugin::users-permissions.user', response.user.id, {
      data: {
        verificationCode: code,
        isVerified: false,
      },
    });

    // Send email
    await strapi.plugins['email'].services.email.send({
      to: email,
      subject: 'Your Verification Code',
      text: `Your code is: ${code}`,
      html: `<p>Your code is: <strong>${code}</strong></p>`,
    });

    return response;
  },
};
