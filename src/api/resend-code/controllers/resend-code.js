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

    await strapi.entityService.update('plugin::users-permissions.user', currentUser.id, {
      data: {
        verificationCode: code,
        verificationCodeExpiresAt,
      },
    });

    // Send email
    await strapi.plugin('email').service('email').send({
      to: email,
      subject: 'Your Verification Code',
      text: `Your verification code is ${code}`,
    });

    return ctx.send({ message: 'Verification code resent successfully.' });
  },
};




// 'use strict';

// module.exports = {
//   async resend(ctx) {
//     const { email } = ctx.request.body;

//     const user = await strapi.entityService.findMany('plugin::users-permissions.user', {
//       filters: { email },
//     });

//     if (!user || user.length === 0) {
//       return ctx.badRequest('User not found');
//     }

//     const code = Math.floor(100000 + Math.random() * 900000).toString();

//     await strapi.entityService.update('plugin::users-permissions.user', user[0].id, {
//       data: {
//         verificationCode: code,
//       },
//     });

//     await strapi.plugins['email'].services.email.send({
//       to: email,
//       subject: 'Your New Verification Code',
//       html: `<p>Your new code is: <strong>${code}</strong></p>`,
//     });

//     return { message: 'Code resent' };
//   },
// };
