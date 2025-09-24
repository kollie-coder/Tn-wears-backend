'use strict';

/**
 * newsletter-subscription service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::newsletter-subscription.newsletter-subscription', ({ strapi }) => ({
  async subscribe(email, source = 'website') {
    try {

      //  Look for a matching user by email
      const user = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { email },
        select: ['id', 'firstname', 'lastname'],
      });

      // Check if email already exists
      const existingSubscription = await strapi.entityService.findMany(
        'api::newsletter-subscription.newsletter-subscription',
        {
          filters: { email }
        }
      );

      if (existingSubscription.length > 0) {
        // Update existing subscription
        return await strapi.entityService.update(
          'api::newsletter-subscription.newsletter-subscription',
          existingSubscription[0].id,
          {
            data: {
              subscribed: true,
              subscribedAt: new Date(),
              unsubscribedAt: null,
              source,
              user: user ? user.id : null,
            }
          }
        );
      } else {
        // Create new subscription
        return await strapi.entityService.create(
          'api::newsletter-subscription.newsletter-subscription',
          {
            data: {
              email,
              subscribed: true,
              subscribedAt: new Date(),
              source,
              user: user ? user.id : null,
            }
          }
        );
      }
    } catch (error) {
      throw error;
    }
  }
}));
