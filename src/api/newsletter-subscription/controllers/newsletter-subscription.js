'use strict';

/**
 * newsletter-subscription controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::newsletter-subscription.newsletter-subscription', ({ strapi }) => ({
  async create(ctx) {
    try {
      const { email, source } = ctx.request.body.data;
      
      if (!email) {
        return ctx.badRequest('Email is required');
      }

      const subscription = await strapi
          .service('api::newsletter-subscription.newsletter-subscription')
          .subscribe(email, source || 'website');
      
      ctx.body = {
        data: subscription,
        message: 'Successfully subscribed to newsletter'
      };
    } catch (error) {
      if (error.message.includes('unique')) {
        return ctx.badRequest('Email already subscribed');
      }
      throw error;
    }
  }
}));