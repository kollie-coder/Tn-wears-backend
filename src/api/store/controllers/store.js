'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::store.store', ({ strapi }) => ({
  async find(ctx) {
    // Use Strapi entity service to fetch stores with deep population
    const stores = await strapi.entityService.findMany('api::store.store', {
      populate: {
        storeImage: true,
        products: {
          populate: {
            images: true,
            product_variants: {
              populate: {
                images: true,
                sizes: true,
                color: true,
              },
            },
          },
        },
      },
    });

    // Remove duplicates based on documentId
    const uniqueStores = stores.filter(
      (store, index, self) =>
        index === self.findIndex((s) => s.documentId === store.documentId)
    );

    return uniqueStores;
  },

   async findOne(ctx) {
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
                sizes: true,
                color: true,
              },
            },
          },
        },
      },
    });

    return store;
  },

}));


// 'use strict';

// /**
//  * store controller
//  */

// const { createCoreController } = require('@strapi/strapi').factories;

// module.exports = createCoreController('api::store.store');
