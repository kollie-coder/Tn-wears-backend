'use strict';

module.exports = {
  async find(ctx) {
    const { email } = ctx.query;

    if (!email) {
      return ctx.badRequest('Missing email');
    }

    try {
      const user = await strapi
        .query('plugin::users-permissions.user')
        .findOne({ where: { email } });

      if (!user) {
        return ctx.send({ exists: false });
      }

      return ctx.send({
        exists: true,
        provider: user.provider,
      });
    } catch (err) {
      strapi.log.error(err);
      return ctx.internalServerError('Failed to check user');
    }
  },
};
