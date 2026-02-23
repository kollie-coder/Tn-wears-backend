// 'use strict';

// module.exports = {
//   routes: [
//     {
//       method: 'POST',
//       path: '/orders/verify-payment',
//       handler: 'order.verifyPayment',
//       config: {
//         // auth: false, 
//         policies: [],
//         middlewares: [],
//       },
//     },
//     {
//       method: 'GET',
//       path: '/orders/my-orders',
//       handler: 'order.getUserOrders',
//       config: {
//         policies: [],
//         middlewares: [],
//       },
//     },
//     {
//       method: 'GET',
//       path: '/orders/reference/:reference',
//       handler: 'order.getOrderByReference',
//       config: {
//         policies: [],
//         middlewares: [],
//       },
//     },
//     {
//       method: 'POST',
//       path: '/orders/paystack-webhook',
//       handler: 'order.paystackWebhook',
//       config: {
//         auth: false,
//         policies: [],
//         middlewares: [],
//       },
//     },
//   ],
// };

'use strict';

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/orders/verify-payment',
      handler: 'order.verifyPayment',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/orders/my-orders',
      handler: 'order.getUserOrders',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/orders/seller-orders',
      handler: 'order.getSellerOrders',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/orders/reference/:reference',
      handler: 'order.getOrderByReference',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/orders/:orderId/status',
      handler: 'order.updateOrderStatus',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/orders/:orderId/reject',
      handler: 'order.rejectOrder',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/orders/:orderId/tracking',
      handler: 'order.updateTracking',
      config: {
        policies: [],
        middlewares: [],
      },
    },

    {
      method: 'POST',
      path: '/orders/paystack-webhook',
      handler: 'order.paystackWebhook',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};
