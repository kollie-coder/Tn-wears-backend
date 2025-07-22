'use strict';

const axios = require('axios');

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


      // New user - create one
      const newUser = await strapi.plugin('users-permissions').service('user').add({
        email,
        username,
        confirmed: true,
        isVerified: true,
        provider: 'google',
        firstname,
        lastname,
      });

      // Create JWT
      const jwt = strapi.plugin('users-permissions').service('jwt').issue({ id: newUser.id });

      ctx.send({ jwt, newUser });

      
    } catch (err) {
      console.error(err);
      return ctx.internalServerError('Google login failed');
    }
  },
};
