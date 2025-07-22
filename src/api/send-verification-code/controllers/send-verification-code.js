'use strict';

module.exports = {
  async send(ctx) {
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

    // Send email
    await strapi.plugin('email').service('email').send({
      to: email,
      subject: 'Your Verification Code',
      text: `Your verification code is: ${code}`,
    });

    // Update the user with the verification code
    await strapi.db.query('plugin::users-permissions.user').update({
      where: { id: user.id },
      data: {
        verificationCode: code, // make sure this field exists in User content type
        verificationCodeExpiresAt: new Date(Date.now() + 5 * 60 * 1000), // optional: expires in 5 min
      },
    });

    return ctx.send({ message: 'Verification code sent.' });
  }
};





// // src/api/user/controllers/send-verification-code.js

// 'use strict';

// module.exports = {
//   async send(ctx) {
//     const userEmail = ctx.state.user?.email || ctx.request.body.email;

//     if (!userEmail) {
//       return ctx.badRequest('Missing email');
//     }

//     // Generate a 6-digit code
//     const code = Math.floor(100000 + Math.random() * 900000).toString();

//     // Store it in DB or cache - this is up to you
//     // For demo, store in user metadata (if you use users-permissions plugin)
//     const user = await strapi.query('plugin::users-permissions.user').findOne({
//       where: { email: userEmail },
//     });

//     if (!user) return ctx.notFound('User not found');

//     await strapi.query('plugin::users-permissions.user').update({
//       where: { id: user.id },
//       data: {
//         verification_code: code,
//       },
//     });

//     // Send email
//     await strapi.plugin('email').service('email').send({
//       to: userEmail,
//       subject: 'Your verification code',
//       text: `Your code is: ${code}`,
//     });

//     return ctx.send({ success: true });
//   },
// };
