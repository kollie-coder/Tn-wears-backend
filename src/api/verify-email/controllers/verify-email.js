'use strict';

module.exports = {
  async verify(ctx) {
    const { email, code } = ctx.request.body;

    if (!email || !code) {
      return ctx.badRequest('Email and verification code are required.');
    }

    // Find the user
    const user = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { email },
    });

    if (!user) {
      return ctx.notFound('User not found.');
    }

    // Check if verification code matches
    if (user.verificationCode !== code) {
      return ctx.badRequest('Invalid verification code.');
    }

    // Check if code has expired
    const now = new Date();
    if (user.verificationCodeExpiresAt && new Date(user.verificationCodeExpiresAt) < now) {
      return ctx.badRequest('Verification code has expired. Please request a new one.');
    }

    // Mark user as verified (optional — depends on your setup)
    await strapi.db.query('plugin::users-permissions.user').update({
      where: { id: user.id },
      data: {
        verificationCode: null,
        verificationCodeExpiresAt: null,
        isVerified: true, // optional: mark as confirmed
      },
    });

    return ctx.send({ message: 'Email successfully verified.' });
  }
};
