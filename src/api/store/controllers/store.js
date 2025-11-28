'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::store.store', ({ strapi }) => ({
  
  async find(ctx) {
    try {
      const stores = await strapi.entityService.findMany('api::store.store', {
        populate: {
          storeImage: true,
          products: {
            populate: {
              images: true,
              product_variants: {
                populate: {
                  images: true,
                  color: true,
                  size_variants: {
                    populate: {
                      size: true, // populate size details
                    },
                  },
                },
              },
            },
          },
        },
      });

      // Remove duplicate stores by documentId
      const uniqueStores = stores.filter(
        (store, index, self) =>
          index === self.findIndex((s) => s.documentId === store.documentId)
      );

      return uniqueStores;
    } catch (error) {
      strapi.log.error('Error fetching stores with variants:', error);
      ctx.throw(500, 'Internal server error');
    }
  },


  async findOne(ctx) {
    try {
      const { id } = ctx.params;

      const store = await strapi.entityService.findOne('api::store.store', id, {
        populate: {
          storeImage: true,
          products: {
            populate: {
              images: true,
              product_variants: {
                populate: {
                  images: true,
                  color: true,
                  size_variants: {
                    populate: {
                      size: true, // populate size details
                    },
                  },
                },
              },
            },
          },
        },
      });

      return store;
    } catch (error) {
      strapi.log.error('Error fetching store with variants:', error);
      ctx.throw(500, 'Internal server error');
    }
  },

}));


// 'use strict';

// /**
//  * store controller
//  */

// const { createCoreController } = require('@strapi/strapi').factories;

// module.exports = createCoreController('api::store.store');
