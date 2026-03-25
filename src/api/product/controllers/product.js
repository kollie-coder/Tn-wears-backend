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
          // store: true,
          store: {
            populate: {
              owner: {
                fields: ['id', 'firstname', 'lastname', 'username', 'userType'],
              },
            },
          },
          tags: true,
          collections: true,
          reviews: true,
          product_variants: {
            populate: {
              images: true,
              color: true,
              size_variants: {
                populate: { size: true },
              },
            }
          },
        },
        limit: 1,
      }); 

      // findMany returns an array, so get the first item
      const foundProduct = product[0];

      
      console.log('store:', JSON.stringify(foundProduct?.store, null, 2));

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
        populate: {
          images: true,
          categories: true,
          store: true,
          tags: true,
          product_variants: {
            populate: {
              images: true,
              color: true,
              size_variants: {
                populate: { size: true },
              },
            },
          },
        },
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
            // populate: ['images', 'category', 'store', 'tags'],
            populate: {
              images: true,
              categories: true,
              store: true,
              tags: true,
              product_variants: {
                populate: {
                  images: true,
                  color: true,
                  size_variants: {
                    populate: { size: true },
                  },
                }
              }
            },
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

    // if (price) {
    //   const match = price.match(/Under\s*(\d+)/i);
    //   if (match) {
    //     const priceLimit = parseInt(match[1], 10);
    //     filters.price = { $lt: priceLimit };
    //   }
    // }

  if (price) {
    const match = price.match(/Under\s*(\d+)/i);
    if (match) {
      const priceLimit = parseInt(match[1], 10);
      filters.product_variants = {
        // price: { $lt: priceLimit }
        size_variants: {
          price: { $lt: priceLimit },
        },
      };
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
          collections: true,
          product_variants: {
            populate: {
              images: true,
              color: true,
              size_variants: {
                populate: { size: true },
              },
            },
          },
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
},

// async findByStore(ctx) {
//   try {
//     const { storeId } = ctx.params;
//     const { page = 1, pageSize = 12 } = ctx.query;

//     // Use findMany instead of findPage
//     const products = await strapi.entityService.findMany('api::product.product', {
//       filters: {
//         store: { documentId: { $eq: storeId } }
//       },
//       populate: {
//         images: true,
//         categories: true,
//         store: true,
//         tags: true,
//         collections: true,
//         product_variants: {
//           populate: {
//             images: true,
//             color: true,
//             size_variants: {
//               populate: { size: true },
//             },
//           },
//         },
//       },
//       sort: [{ createdAt: 'desc' }],
//       start: (page - 1) * pageSize,
//       limit: pageSize,
//     });

//     // Deduplicate by documentId
//     const seen = new Set();
//     const uniqueProducts = products.filter(p => {
//       if (seen.has(p.documentId)) return false;
//       seen.add(p.documentId);
//       return true;
//     });

//     // Get total count for pagination
//     const total = await strapi.entityService.count('api::product.product', {
//       filters: { store: { documentId: { $eq: storeId } } }
//     });

//     return {
//       results: uniqueProducts,
//       pagination: {
//         page: Number(page),
//         pageSize: Number(pageSize),
//         pageCount: Math.ceil(total / pageSize),
//         total,
//       },
//     };
//   } catch (err) {
//     console.error("Error in findByStore:", err);
//     ctx.throw(500, "Failed to fetch store products");
//   }
// },


async findByStore(ctx) {
  try {
    const { storeId } = ctx.params;
    const { page = 1, pageSize = 12 } = ctx.query;

    // ✅ Fetch products by storeId with all nested relations
    const products = await strapi.entityService.findMany("api::product.product", {
      filters: {
        store: { documentId: { $eq: storeId } },
      },
      populate: {
        images: true,
        categories: true,
        store: true,
        tags: true,
        collections: true,
        product_variants: {
          populate: {
            images: true,
            color: true,
            size_variants: {
              populate: {
                size: true,
              },
            },
          },
        },
      },
      sort: [{ createdAt: "desc" }],
      start: (page - 1) * pageSize,
      limit: pageSize,
    });

    // ✅ Deduplicate by documentId (Strapi sometimes returns duplicates)
    const seen = new Set();
    const uniqueProducts = products.filter((p) => {
      if (seen.has(p.documentId)) return false;
      seen.add(p.documentId);
      return true;
    });

    // ✅ Normalize data for frontend use
    const formattedProducts = uniqueProducts.map((p) => {
      const variants = p.product_variants?.map((v) => ({
        id: v.id,
        documentId: v.documentId,
        color: v.color?.name || null,
        price: Number(v.price) || 0,
        discountPrice: Number(v.discountPrice) || null,
        stock: v.stock ?? 0,
        images: v.images || [],
        sizes:
          v.size_variants?.map((sv) => ({
            id: sv.id,
            documentId: sv.documentId,
            name: sv.size?.label || null,
            price: Number(sv.price) || 0,
            discountPrice: Number(sv.discountPrice) || null,
            stock: sv.stock ?? 0,
          })) || [],
      }));

      // Choose the first available variant and size for table preview
      const firstVariant = variants?.[0];
      const firstSize = firstVariant?.sizes?.[0];

      return {
        id: p.id,
        documentId: p.documentId,
        name: p.name,
        store: p.store,
        categories: p.categories,
        tags: p.tags,
        collections: p.collections,
        images: p.images,
        price:
          firstSize?.price ||
          firstVariant?.price ||
          0,
        discountPrice:
          firstSize?.discountPrice ||
          firstVariant?.discountPrice ||
          null,
        stock:
          firstSize?.stock ??
          firstVariant?.stock ??
          0,
        variants,
      };
    });

    // ✅ Pagination count
    const total = await strapi.entityService.count("api::product.product", {
      filters: { store: { documentId: { $eq: storeId } } },
    });

    return {
      results: formattedProducts,
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        pageCount: Math.ceil(total / pageSize),
        total,
      },
    };
  } catch (err) {
    console.error(" Error in findByStore:", err);
    ctx.throw(500, "Failed to fetch store products");
  }
},


async suggested(ctx) {
  try {
    const { id: currentId } = ctx.params;
    const { storeId, collectionId } = ctx.query;

    // Build filters
    const filters = {
      $and: [
        { documentId: { $ne: currentId } },
        {
          $or: [
            storeId ? { store: { documentId: { $eq: storeId } } } : {},
            collectionId ? { collections: { documentId: { $eq: collectionId } } } : {},
          ].filter((f) => Object.keys(f).length > 0), // remove empty filters
        },
      ],
    };

    // Fetch suggested products
    let products = await strapi.entityService.findMany('api::product.product', {
      filters,
      populate: {
        images: true,
        categories: true,
        store: true,
        tags: true,
        collections: true,
        product_variants: {
          populate: {
            images: true,
            color: true,
            size_variants: {
              populate: { size: true },
            },
          },
        },
      },
      limit: 4,
    });

    // Fallback if none found
    if (!products.length) {
      products = await strapi.entityService.findMany('api::product.product', {
        filters: { documentId: { $ne: currentId } },
        populate: {
          images: true,
          categories: true,
          store: true,
          tags: true,
          product_variants: {
            populate: {
              images: true,
              color: true,
              size_variants: {
                populate: { size: true },
              },
            },
          },
        },
        sort: [{ createdAt: 'desc' }],
        limit: 4,
      });
    }

    // Normalize products
    const normalizeProducts = (products) =>
      products.map((p) => {
        const firstVariant = p.product_variants?.[0] || {};
        return {
          id: p.id,
          documentId: p.documentId,
          name: p.name,
          description: p.description,
          images: p.images?.length ? p.images : firstVariant.images || [],
          // price: firstVariant.price || p.price || 0,
          // discountPrice: firstVariant.discountPrice || p.discountPrice || null,
          price:
            firstVariant.size_variants?.[0]?.price ||
            firstVariant.price ||
            p.price ||
            0,
          discountPrice:
            firstVariant.size_variants?.[0]?.discountPrice ||
            firstVariant.discountPrice ||
            p.discountPrice ||
            null,
          colors: p.product_variants?.map((v) => v.color).filter(Boolean) || [],
          // sizes: p.product_variants?.flatMap((v) => v.sizes).filter(Boolean) || [],
           sizes:
              p.product_variants
                ?.flatMap(v => v.size_variants?.map(sv => sv.size))
                .filter(Boolean) || [],
          shipping: p.shipping,
          store: p.store,
          categories: p.categories,
        };
      });

    const normalized = normalizeProducts(products);

    return { data: normalized };
  } catch (err) {
    console.error("💥 Error in suggested:", err);
    ctx.throw(500, "Failed to fetch suggested products");
  }
},

// ✅ Restore default Strapi v5 "create" logic


// async suggested(ctx) {
//   try {
//     const { id: currentId } = ctx.params;
//     const { storeId, collectionId } = ctx.query;

//     // Build filters: same store OR same collection, excluding current product
//     const filters = {
//       $and: [
//         { documentId: { $ne: currentId } },
//         {
//           $or: [
//             { store: { documentId: { $eq: storeId } } },
//             { collections: { documentId: { $eq: collectionId } } },
//           ],
//         },
//       ],
//     };

//     // Fetch suggested products
//     let products = await strapi.entityService.findMany('api::product.product', {
//       filters,
//       populate: {
//         images: true,
//         categories: true,
//         store: true,
//         tags: true,
//         product_variants: {
//           populate: {
//             images: true,
//             sizes: true,
//             color: true,
//           },
//         },
//       },
//       limit: 4,
//     });

//     // If no matches, fallback to random/latest 4
//     if (!products.length) {
//       products = await strapi.entityService.findMany('api::product.product', {
//         filters: { documentId: { $ne: currentId } },
//         populate: {
//           images: true,
//           categories: true,
//           store: true,
//           tags: true,
//           product_variants: {
//             populate: {
//               images: true,
//               sizes: true,
//               color: true,
//             },
//           },
//         },
//         sort: [{ createdAt: 'desc' }],
//         limit: 4,
//       });
//     }

//     // Normalize product data
//     const normalizeProducts = (products) =>
//       products.map((p) => {
//         const firstVariant = p.product_variants?.[0] || {};
//         return {
//           id: p.id,
//           documentId: p.documentId,
//           name: p.name,
//           description: p.description,
//           images: p.images?.length ? p.images : firstVariant.images || [],
//           price: firstVariant.price || p.price || 0,
//           discountPrice: firstVariant.discountPrice || p.discountPrice || null,
//           colors: p.product_variants?.map((v) => v.color).filter(Boolean) || [],
//           sizes: p.product_variants?.flatMap((v) => v.sizes).filter(Boolean) || [],
//           shipping: p.shipping,
//           store: p.store,
//           categories: p.categories,
//         };
//       });

//     return { data: normalizeProducts(products) };
//   } catch (err) {
//     console.error('Error in suggested:', err);
//     ctx.throw(500, 'Failed to fetch suggested products');
//   }
// },

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
