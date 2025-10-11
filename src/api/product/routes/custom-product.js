'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/products/trending',
      handler: 'product.trending',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/products/search',
      handler: 'product.search', 
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/products/store/:storeId',
      handler: 'product.findByStore',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/products/suggested/:id',
      handler: 'product.suggested',
      config: {
        auth: false,
      },
    },

  ],
};
