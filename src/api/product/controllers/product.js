'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::product.product', ({ strapi }) => ({

// Custom findOne method to get single product with ALL relations + increment views
   async findOne(ctx) {
    const { id: documentId } = ctx.params; // documentId from URL params

    try {
      // Fetch the product using documentId with all relations populated
      const product = await strapi.entityService.findMany('api::product.product', {
        filters: { documentId: { $eq: documentId } },
        populate: {
          images: true,
          categories: true,
          store: true,
          tags: true,
          sizes: true,
          colors: true,
          collections: true,
          reviews: true
        },
        limit: 1,
      }); 

      // findMany returns an array, so get the first item
      const foundProduct = product[0];

      if (!foundProduct) {
        return ctx.notFound('Product not found');
      }

      // Increment views automatically using the actual database ID
      await strapi.entityService.update('api::product.product', foundProduct.id, {
        data: { views: (foundProduct.views || 0) + 1 }
      });

      // Return the complete product data with updated view count
      return {
        data: {
          ...foundProduct,
          views: (foundProduct.views || 0) + 1,
        }
      };
    } catch (err) {
      console.error('Error in findOne:', err);
      ctx.throw(500, err);
    }
  },

async trending(ctx) {
    try {
      let trendingProducts = await strapi.entityService.findMany('api::product.product', {
        filters: {
          $or: [
            { isTrending: { $eq: true } },
            { views: { $gte: 50 } },
            { salesCount: { $gte: 10 } },
          ],
        },
        sort: [
          { isTrending: 'desc' },
          { salesCount: 'desc' },
          { views: 'desc' },
        ],
        populate: ['images', 'categories', 'store', 'tags'],
        limit: 20,
      });

      // Deduplicate by ID
      const seen = new Set();
      const uniqueProducts = trendingProducts.filter(p => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      });

      // fallback to latest if empty
      if (uniqueProducts.length === 0) {
        uniqueProducts.push(
          ...(await strapi.entityService.findMany('api::product.product', {
            sort: [{ createdAt: 'desc' }],
            populate: ['images', 'category', 'store', 'tags'],
            limit: 10,
          }))
        );
      }

      return { data: uniqueProducts.slice(0, 10) }; // ✅ entity-style response
    } catch (err) {
      ctx.throw(500, err);
    }
  },

  async search(ctx) {
  try {
    const { categories, price, q, sort, newArrivals } = ctx.query;

    // 🔹 Build filters dynamically
    const filters = {};

    if (categories) {
      filters.categories = { name: { $eq: categories } };
    }

    if (price) {
      const match = price.match(/Under\s*(\d+)/i);
      if (match) {
        const priceLimit = parseInt(match[1], 10);
        filters.price = { $lt: priceLimit };
      }
    }

    if (q) {
      filters.$or = [
        { name: { $containsi: q } },
        { description: { $containsi: q } }
      ];
    }

     //  Handle new arrivals: last 7 days
    if (newArrivals === "true") {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      filters.createdAt = { $gte: sevenDaysAgo };
    }

    //  Sorting
    let sortOption = [{ createdAt: "desc" }];
    if (sort) {
      const [field, order] = sort.split(":"); // e.g. "price:asc"
      const sortObj = {};
      sortObj[field] = order === "asc" ? "asc" : "desc";
      sortOption = [sortObj];
    }

    const products = await strapi.entityService.findMany('api::product.product', {
      filters,
      populate: {
        images: true,
        categories: true,
        store: true,
        tags: true,
        sizes: true,
        colors: true,
        collections: true,
      },
      // sort: [{ createdAt: 'desc' }],
      sort: sortOption,
      limit: 30,
    });

    return { data: products };

  } catch (err) {
    console.error('Error in search:', err);
    ctx.throw(500, 'Internal Server Error in search');
  }
}

}));




// 'use strict';

// const { createCoreController } = require('@strapi/strapi').factories;

// module.exports = createCoreController('api::product.product', ({ strapi }) => ({

//  // findOne with auto view increment  
//   async findOne(ctx) {
//     const { id } = ctx.params;

//     // Fetch product
//     const product = await strapi.db.query('api::product.product').findOne({
//       where: { id },
//       populate: ['images', 'category', 'store', 'tags']
//     });

//     if (!product) {
//       return ctx.notFound('Product not found');
//     }

//     // Increment views
//     await strapi.db.query('api::product.product').update({
//       where: { id },
//       data: { views: (product.views || 0) + 1 }
//     });

//     return { 
//         ...product,
//         views: (product.views || 0) + 1,
//     };
//   },

//   //  Custom Trending Endpoint
//   async trending(ctx) {
//   try {
//     let trendingProducts = await strapi.db.query('api::product.product').findMany({
//       where: {
//         $or: [
//           { isTrending: true }, // manually flagged
//           { views: { $gte: 50 } },
//           { salesCount: { $gte: 10 } },
//         ],
//       },
//       orderBy: [
//         { isTrending: 'desc' },
//         { salesCount: 'desc' },
//         { views: 'desc' },
//       ],
//       limit: 10,
//       populate: ['images', 'category', 'store', 'tags'],
//     });

//     // fallback: latest products if no trending
//     if (!trendingProducts || trendingProducts.length === 0) {
//       trendingProducts = await strapi.db.query('api::product.product').findMany({
//         orderBy: [{ createdAt: 'desc' }],
//         limit: 10,
//         populate: ['images', 'category', 'store', 'tags'],
//       });
//     }

//     return { data: trendingProducts };  // ✅ important
//   } catch (err) {
//     ctx.throw(500, err);
//   }
// }
// }));

//   async trending(ctx) {
//   try {
//     let trendingProducts = await strapi.db.query('api::product.product').findMany({
//       where: {
//         $or: [
//           { isTrending: true }, // manually flagged
//           { views: { $gte: 50 } }, // popular by views
//           { salesCount: { $gte: 10 } }, // popular by sales
//         ],
//       },
//       orderBy: [
//         { isTrending: 'desc' },
//         { salesCount: 'desc' },
//         { views: 'desc' },
//       ],
//       limit: 10,
//       populate: ['images', 'category', 'store', 'tags'],
//     });

//     // 👇 fallback: if no trending, show latest products instead
//     if (!trendingProducts || trendingProducts.length === 0) {
//       trendingProducts = await strapi.db.query('api::product.product').findMany({
//         orderBy: [{ createdAt: 'desc' }],
//         limit: 10,
//         populate: ['images', 'category', 'store', 'tags'],
//       });
//     }

//     return trendingProducts;
//   } catch (err) {
//     ctx.throw(500, err);
//   }
// }


//   async trending(ctx) {
//     const trendingProducts = await strapi.db.query('api::product.product').findMany({
//       where: {
//         $or: [
//           { isTrending: true }, // manually set flag
//           { views: { $gte: 50 } }, // auto trending by views
//           { salesCount: { $gte: 10 } }, // auto trending by sales
//         ],
//       },
//       orderBy: [
//         { isTrending: 'desc' },
//         { salesCount: 'desc' },
//         { views: 'desc' },
//       ],
//       limit: 10,
//       populate: ['images', 'category', 'store', 'tags'],
//     });

//     return trendingProducts;
//   },




// 'use strict';

// /**
//  * product controller
//  */

// const { createCoreController } = require('@strapi/strapi').factories;

// module.exports = createCoreController('api::product.product');
