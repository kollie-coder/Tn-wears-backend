// 'use strict';

// const axios = require('axios');

// /**
//  * order controller
//  */

// const { createCoreController } = require('@strapi/strapi').factories;

// module.exports = createCoreController('api::order.order', ({ strapi }) => ({
  

// async verifyPayment(ctx) {
//     try {
//       const { reference, orderDetails } = ctx.request.body;
//       const userId = ctx.state.user?.id;

//       console.log('=== Payment Verification Started ===');
//       console.log('Reference:', reference);
//       console.log('User ID:', userId);
//       console.log('Order Details:', JSON.stringify(orderDetails, null, 2));

//       // Validate input
//       if (!reference || !orderDetails) {
//         console.error('Missing required fields');
//         return ctx.badRequest('Missing payment reference or order details');
//       }

//       // Verify payment with Paystack
//       console.log('Verifying with Paystack...');
//       const paystackResponse = await axios.get(
//         `https://api.paystack.co/transaction/verify/${reference}`,
//         {
//           headers: {
//             Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
//             'Content-Type': 'application/json'
//           }
//         }
//       );

//       const { data: paymentData } = paystackResponse.data;
//       console.log('Paystack Response:', JSON.stringify(paymentData, null, 2));

//       // Check if payment was successful
//       if (paymentData.status !== 'success') {
//         console.error('Payment not successful:', paymentData.status);
//         return ctx.badRequest('Payment verification failed', {
//           status: paymentData.status,
//           message: 'Payment was not successful'
//         });
//       }

//       // Verify amount matches (Paystack returns amount in kobo)
//       const expectedAmount = Math.round(orderDetails.totalToPay * 100);
//       const receivedAmount = paymentData.amount;
      
//       console.log('Amount verification:', {
//         expected: expectedAmount,
//         received: receivedAmount,
//         match: expectedAmount === receivedAmount
//       });

//       if (receivedAmount !== expectedAmount) {
//         strapi.log.error('Amount mismatch:', {
//           expected: expectedAmount,
//           received: receivedAmount
//         });
//         return ctx.badRequest('Payment amount mismatch');
//       }

//       // Check if order with this payment reference already exists
//       const existingOrder = await strapi.db.query('api::order.order').findOne({
//         where: { paymentReference: reference }
//       });

//       if (existingOrder) {
//         console.log('Order already exists:', existingOrder.id);
//         return ctx.send({
//           success: true,
//           message: 'Order already exists',
//           order: {
//             id: existingOrder.id,
//             orderReference: existingOrder.orderReference,
//             totalAmount: existingOrder.totalAmount,
//             paymentStatus: existingOrder.paymentStatus,
//             orderStatus: existingOrder.orderStatus,
//             items: existingOrder.items,
//             subtotal: existingOrder.subtotal,
//             deliveryFee: existingOrder.deliveryFee,
//             tip: existingOrder.tip,
//             estimatedDeliveryDate: existingOrder.estimatedDeliveryDate
//           }
//         });
//       }

//       // Calculate estimated delivery date (7 days from now)
//       const estimatedDeliveryDate = new Date();
//       estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + 7);

//       console.log('Creating order in database...');
      
//       // Create order in database
//       const order = await strapi.entityService.create('api::order.order', {
//         data: {
//           orderReference: `ORD-${Date.now()}`,
//           items: orderDetails.items,
//           subtotal: parseFloat(orderDetails.subtotal),
//           deliveryFee: parseFloat(orderDetails.deliveryFee),
//           tip: parseFloat(orderDetails.tip || 0),
//           totalAmount: parseFloat(orderDetails.totalToPay),
//           paymentReference: reference,
//           paymentStatus: 'paid',
//           orderStatus: 'processing',
//           deliveryAddress: orderDetails.address,
//           customerEmail: paymentData.customer?.email || orderDetails.email,
//           customerName: paymentData.customer?.customer_code,
//           paymentMethod: paymentData.channel,
//           estimatedDeliveryDate: estimatedDeliveryDate,
//           user: userId || null,
//           publishedAt: new Date()
//         }
//       });

//       console.log('Order created successfully:', order.id);

//       // Return success response with all needed data
//       const responseData = {
//         success: true,
//         message: 'Payment verified and order created successfully',
//         order: {
//           id: order.id,
//           orderReference: order.orderReference,
//           totalAmount: order.totalAmount,
//           paymentStatus: order.paymentStatus,
//           orderStatus: order.orderStatus,
//           items: order.items,
//           subtotal: order.subtotal,
//           deliveryFee: order.deliveryFee,
//           tip: order.tip,
//           estimatedDeliveryDate: order.estimatedDeliveryDate,
//           createdAt: order.createdAt
//         }
//       };

//       console.log('Sending response:', JSON.stringify(responseData, null, 2));
//       console.log('=== Payment Verification Completed ===');

//       return ctx.send(responseData);

//     } catch (error) {
//       console.error('=== Payment Verification Error ===');
//       console.error('Error:', error);
//       console.error('Error Response:', error.response?.data);

//       // Handle Paystack API errors
//       if (error.response) {
//         const errorMessage = error.response.data?.message || 'Unable to verify payment with Paystack';
//         console.error('Paystack error:', errorMessage);
//         return ctx.badRequest('Payment verification failed', {
//           message: errorMessage,
//           details: error.response.data
//         });
//       }

//       // Handle other errors
//       return ctx.internalServerError('An error occurred while processing your order', {
//         error: error.message
//       });
//     }
//   },

//   /**
//    * Get user's orders
//    */
//   async getUserOrders(ctx) {
//     try {
//       const userId = ctx.state.user?.id;

//       if (!userId) {
//         return ctx.unauthorized('You must be logged in to view orders');
//       }

//       const orders = await strapi.entityService.findMany('api::order.order', {
//         filters: { user: userId },
//         sort: { createdAt: 'DESC' },
//         populate: ['user']
//       });

//       return ctx.send({
//         success: true,
//         orders
//       });

//     } catch (error) {
//       strapi.log.error('Error fetching user orders:', error);
//       return ctx.internalServerError('Unable to fetch orders');
//     }
//   },

//   /**
//    * Get single order by reference
//    */
//   async getOrderByReference(ctx) {
//     try {
//       const { reference } = ctx.params;
//       const userId = ctx.state.user?.id;

//       const order = await strapi.db.query('api::order.order').findOne({
//         where: { orderReference: reference },
//         populate: ['user']
//       });

//       if (!order) {
//         return ctx.notFound('Order not found');
//       }

//       // Check if user owns this order
//       if (userId && order.user?.id !== userId) {
//         return ctx.forbidden('You do not have permission to view this order');
//       }

//       return ctx.send({
//         success: true,
//         order
//       });

//     } catch (error) {
//       strapi.log.error('Error fetching order:', error);
//       return ctx.internalServerError('Unable to fetch order');
//     }
//   },

//   /**
//    * Webhook handler for Paystack events
//    */
//   async paystackWebhook(ctx) {
//     try {
//       const hash = require('crypto')
//         .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
//         .update(JSON.stringify(ctx.request.body))
//         .digest('hex');

//       // Verify webhook signature
//       if (hash !== ctx.request.headers['x-paystack-signature']) {
//         return ctx.badRequest('Invalid signature');
//       }

//       const event = ctx.request.body;

//       // Handle different event types
//       switch (event.event) {
//         case 'charge.success':
//           strapi.log.info('Payment successful webhook:', event.data.reference);
//           // Additional logic if needed
//           break;

//         case 'charge.failed':
//           strapi.log.warn('Payment failed webhook:', event.data.reference);
//           // Update order status if needed
//           break;

//         default:
//           strapi.log.info('Unhandled webhook event:', event.event);
//       }

//       return ctx.send({ success: true });

//     } catch (error) {
//       strapi.log.error('Webhook error:', error);
//       return ctx.internalServerError('Webhook processing failed');
//     }
//   }

// }));




'use strict';

const axios = require('axios');

/**
 * order controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::order.order', ({ strapi }) => ({
  
  async verifyPayment(ctx) {
    try {
      const { reference, orderDetails } = ctx.request.body;
      const userId = ctx.state.user?.id;

      console.log('=== Payment Verification Started ===');
      console.log('Reference:', reference);
      console.log('User ID:', userId);
      console.log('Order Details:', JSON.stringify(orderDetails, null, 2));

      // Validate input
      if (!reference || !orderDetails) {
        console.error('Missing required fields');
        return ctx.badRequest('Missing payment reference or order details');
      }

      // Verify payment with Paystack
      console.log('Verifying with Paystack...');
      const paystackResponse = await axios.get(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const { data: paymentData } = paystackResponse.data;
      console.log('Paystack Response:', JSON.stringify(paymentData, null, 2));

      // Check if payment was successful
      if (paymentData.status !== 'success') {
        console.error('Payment not successful:', paymentData.status);
        return ctx.badRequest('Payment verification failed', {
          status: paymentData.status,
          message: 'Payment was not successful'
        });
      }

      // Verify amount matches (Paystack returns amount in kobo)
      const expectedAmount = Math.round(orderDetails.totalToPay * 100);
      const receivedAmount = paymentData.amount;
      
      console.log('Amount verification:', {
        expected: expectedAmount,
        received: receivedAmount,
        match: expectedAmount === receivedAmount
      });

      if (receivedAmount !== expectedAmount) {
        strapi.log.error('Amount mismatch:', {
          expected: expectedAmount,
          received: receivedAmount
        });
        return ctx.badRequest('Payment amount mismatch');
      }

      // Check if order with this payment reference already exists
      const existingOrders = await strapi.db.query('api::order.order').findMany({
        where: { paymentReference: reference }
      });

      if (existingOrders && existingOrders.length > 0) {
        console.log('Orders already exist for this payment reference');
        return ctx.send({
          success: true,
          message: 'Orders already exist',
          orders: existingOrders.map(order => ({
            id: order.id,
            orderReference: order.orderReference,
            totalAmount: order.totalAmount,
            paymentStatus: order.paymentStatus,
            orderStatus: order.orderStatus,
            items: order.items,
            subtotal: order.subtotal,
            deliveryFee: order.deliveryFee,
            tip: order.tip,
            estimatedDeliveryDate: order.estimatedDeliveryDate,
            storeId: order.store
          })),
          order: {
            id: existingOrders[0].id,
            orderReference: existingOrders[0].orderReference,
            totalAmount: orderDetails.totalToPay,
            paymentStatus: existingOrders[0].paymentStatus,
            orderStatus: existingOrders[0].orderStatus,
            items: orderDetails.items,
            subtotal: orderDetails.subtotal,
            deliveryFee: orderDetails.deliveryFee,
            tip: orderDetails.tip,
            estimatedDeliveryDate: existingOrders[0].estimatedDeliveryDate
          }
        });
      }

      // Group items by store
      const itemsByStore = orderDetails.items.reduce((acc, item) => {
        const storeId = item.storeId;
        if (!storeId) {
          console.error('Item missing storeId:', item);
          return acc;
        }
        if (!acc[storeId]) {
          acc[storeId] = {
            storeName: item.storeName,
            items: []
          };
        }
        acc[storeId].items.push(item);
        return acc;
      }, {});

      console.log('Items grouped by store:', Object.keys(itemsByStore).length, 'stores');

      // Calculate estimated delivery date (7 days from now)
      const estimatedDeliveryDate = new Date();
      estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + 7);

      // Create separate orders for each store
      const createdOrders = [];
      const storeCount = Object.keys(itemsByStore).length;
      
      for (const [storeId, storeData] of Object.entries(itemsByStore)) {
        const storeItems = storeData.items;
        
        // Calculate subtotal for this store
        const storeSubtotal = storeItems.reduce((sum, item) => 
          sum + (item.price * item.quantity), 0
        );

        // Divide delivery fee and tip proportionally across stores
        const storeDeliveryFee = orderDetails.deliveryFee / storeCount;
        const storeTip = (orderDetails.tip || 0) / storeCount;
        const storeTotal = storeSubtotal + storeDeliveryFee + storeTip;

        console.log(`Creating order for store ${storeId} (${storeData.storeName})...`);

        try {
          const order = await strapi.entityService.create('api::order.order', {
            data: {
              orderReference: `ORD-${Date.now()}-S${storeId}`,
              items: storeItems,
              subtotal: parseFloat(storeSubtotal.toFixed(2)),
              deliveryFee: parseFloat(storeDeliveryFee.toFixed(2)),
              tip: parseFloat(storeTip.toFixed(2)),
              totalAmount: parseFloat(storeTotal.toFixed(2)),
              paymentReference: reference,
              paymentStatus: 'paid',
              orderStatus: 'processing',
              deliveryAddress: orderDetails.address,
              customerEmail: paymentData.customer?.email || orderDetails.email,
              customerName: paymentData.customer?.customer_code,
              paymentMethod: paymentData.channel,
              estimatedDeliveryDate: estimatedDeliveryDate,
              user: userId || null,
              store: parseInt(storeId),
              publishedAt: new Date()
            }
          });

          createdOrders.push(order);
          console.log(`✅ Order created for store ${storeId}:`, order.orderReference);
        } catch (storeError) {
          console.error(`❌ Failed to create order for store ${storeId}:`, storeError);
          throw new Error(`Failed to create order for store ${storeData.storeName}`);
        }
      }

      console.log(`Successfully created ${createdOrders.length} orders`);

      // Return success response with all created orders
      const responseData = {
        success: true,
        message: `Payment verified and ${createdOrders.length} order(s) created successfully`,
        orders: createdOrders.map(order => ({
          id: order.id,
          orderReference: order.orderReference,
          totalAmount: order.totalAmount,
          paymentStatus: order.paymentStatus,
          orderStatus: order.orderStatus,
          items: order.items,
          subtotal: order.subtotal,
          deliveryFee: order.deliveryFee,
          tip: order.tip,
          estimatedDeliveryDate: order.estimatedDeliveryDate,
          storeId: order.store,
          createdAt: order.createdAt
        })),
        // For backward compatibility with frontend
        order: {
          id: createdOrders[0]?.id,
          orderReference: createdOrders.map(o => o.orderReference).join(', '),
          totalAmount: orderDetails.totalToPay,
          paymentStatus: 'paid',
          orderStatus: 'processing',
          items: orderDetails.items,
          subtotal: orderDetails.subtotal,
          deliveryFee: orderDetails.deliveryFee,
          tip: orderDetails.tip,
          estimatedDeliveryDate: estimatedDeliveryDate,
          createdAt: createdOrders[0]?.createdAt
        }
      };

      console.log('=== Payment Verification Completed ===');
      return ctx.send(responseData);

    } catch (error) {
      console.error('=== Payment Verification Error ===');
      console.error('Error:', error);
      console.error('Error Response:', error.response?.data);

      // Handle Paystack API errors
      if (error.response) {
        const errorMessage = error.response.data?.message || 'Unable to verify payment with Paystack';
        console.error('Paystack error:', errorMessage);
        return ctx.badRequest('Payment verification failed', {
          message: errorMessage,
          details: error.response.data
        });
      }

      // Handle other errors
      return ctx.internalServerError('An error occurred while processing your order', {
        error: error.message
      });
    }
  },

  /**
   * Get user's orders (customer view)
   */
  // async getUserOrders(ctx) {
  //   try {
  //     const userId = ctx.state.user?.id;

  //     if (!userId) {
  //       return ctx.unauthorized('You must be logged in to view orders');
  //     }

  //     const orders = await strapi.entityService.findMany('api::order.order', {
  //       filters: { user: userId },
  //       sort: { createdAt: 'DESC' },
  //       populate: ['user', 'store']
  //     });

  //     return ctx.send({
  //       success: true,
  //       orders: orders.map(order => ({
  //         ...order,
  //         storeName: order.store?.storeName || 'Unknown Store'
  //       })),
  //       total: orders.length
  //     });

  //   } catch (error) {
  //     strapi.log.error('Error fetching user orders:', error);
  //     return ctx.internalServerError('Unable to fetch orders');
  //   }
  // },

  /**
 * Get customer's orders
 */
async getUserOrders(ctx) {
  try {
    const userId = ctx.state.user?.id;

    if (!userId) {
      return ctx.unauthorized('You must be logged in to view orders');
    }

    const orders = await strapi.entityService.findMany('api::order.order', {
      filters: { user: userId },
      sort: { createdAt: 'DESC' },
      populate: ['store']
    });

    // Group orders by status
    const groupedOrders = {
      inTransit: [],
      completed: [],
      cancelled: []
    };

    orders.forEach(order => {
      const transformedOrder = {
        id: order.id,
        orderReference: order.orderReference,
        items: order.items,
        subtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        tip: order.tip,
        totalAmount: order.totalAmount,
        paymentReference: order.paymentReference,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        deliveryAddress: order.deliveryAddress,
        customerEmail: order.customerEmail,
        customerName: order.customerName,
        paymentMethod: order.paymentMethod,
        estimatedDeliveryDate: order.estimatedDeliveryDate,
        trackingNumber: order.trackingNumber,
        deliveredAt: order.deliveredAt,
        rejectionReason: order.rejectionReason,
        rejectedAt: order.rejectedAt,
        storeName: order.store?.storeName || 'Unknown Store',
        storeId: order.store?.id,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      };

      // Categorize orders
      if (order.orderStatus === 'delivered') {
        groupedOrders.completed.push(transformedOrder);
      } else if (order.orderStatus === 'cancelled') {
        groupedOrders.cancelled.push(transformedOrder);
      } else {
        // processing, confirmed, shipped
        groupedOrders.inTransit.push(transformedOrder);
      }
    });

    return ctx.send({
      success: true,
      orders: groupedOrders,
      total: orders.length
    });

  } catch (error) {
    strapi.log.error('Error fetching customer orders:', error);
    return ctx.internalServerError('Unable to fetch orders');
  }
},

  /**
   * Get seller's orders (seller dashboard)
   */
  async getSellerOrders(ctx) {
    try {
      const userId = ctx.state.user?.id;

      if (!userId) {
        return ctx.unauthorized('You must be logged in to view orders');
      }

      // Get seller's stores
      const stores = await strapi.entityService.findMany('api::store.store', {
        filters: { owner: userId },
        fields: ['id', 'storeName']
      });

      if (!stores || stores.length === 0) {
        return ctx.send({
          success: true,
          orders: [],
          total: 0,
          message: 'No stores found for this user'
        });
      }

      const storeIds = stores.map(store => store.id);
      console.log('Fetching orders for stores:', storeIds);

      // Fetch orders for seller's stores only
      const orders = await strapi.entityService.findMany('api::order.order', {
        filters: {
          store: {
            id: {
              $in: storeIds
            }
          }
        },
        sort: { createdAt: 'DESC' },
        populate: ['user', 'store'],
        limit: 100,
      });

      // Transform orders to match frontend expectations
      const transformedOrders = orders.map(order => ({
        id: order.id,
        orderReference: order.orderReference,
        product: order.items.map(item => item.name).join(', '),
        orderDate: new Date(order.createdAt).toISOString().split('T')[0],
        price: `₦${order.totalAmount}`,
        quantity: order.items.reduce((sum, item) => sum + item.quantity, 0),
        trackingId: order.orderReference,
        paymentStatus: order.paymentStatus === 'paid' ? 'Paid' : 
                       order.paymentStatus === 'pending' ? 'Pending' : 
                       order.paymentStatus === 'failed' ? 'Failed' : 'Pending',
        status: order.orderStatus === 'processing' ? 'Processing' :
                order.orderStatus === 'confirmed' ? 'Confirmed'  :
                order.orderStatus === 'shipped' ? 'Shipped' :
                order.orderStatus === 'delivered' ? 'Delivered' :
                order.orderStatus === 'cancelled' ? 'Cancelled' : 'Processing',
        items: order.items,
        deliveryAddress: order.deliveryAddress,
        customerEmail: order.customerEmail,
        customerName: order.customerName,
        estimatedDeliveryDate: order.estimatedDeliveryDate,
        storeName: order.store?.storeName,
        storeId: order.store?.id,

        rejectionReason: order.rejectionReason,
        rejectedAt: order.rejectedAt,
        trackingNumber: order.trackingNumber
      }));

      return ctx.send({
        success: true,
        orders: transformedOrders,
        total: orders.length,
        stores: stores
      });

    } catch (error) {
      strapi.log.error('Error fetching seller orders:', error);
      return ctx.internalServerError('Unable to fetch orders');
    }
  },

  /**
   * Get single order by reference
   */
  async getOrderByReference(ctx) {
    try {
      const { reference } = ctx.params;
      const userId = ctx.state.user?.id;

      const order = await strapi.db.query('api::order.order').findOne({
        where: { orderReference: reference },
        populate: ['user', 'store']
      });

      if (!order) {
        return ctx.notFound('Order not found');
      }

      // Check if user owns this order or is the store owner
      const userOwnsOrder = userId && order.user?.id === userId;
      
      let userOwnsStore = false;
      if (order.store?.id) {
        const store = await strapi.entityService.findOne('api::store.store', order.store.id, {
          populate: ['owner']
        });
        userOwnsStore = store?.owner?.id === userId;
      }

      if (userId && !userOwnsOrder && !userOwnsStore) {
        return ctx.forbidden('You do not have permission to view this order');
      }

      return ctx.send({
        success: true,
        order: {
          ...order,
          storeName: order.store?.storeName || 'Unknown Store'
        }
      });

    } catch (error) {
      strapi.log.error('Error fetching order:', error);
      return ctx.internalServerError('Unable to fetch order');
    }
  },

  /**
   * Update order status (seller only)
   */
  async updateOrderStatus(ctx) {
    try {
      const { orderId } = ctx.params;
      const { status } = ctx.request.body;
      const userId = ctx.state.user?.id;

      if (!userId) {
        return ctx.unauthorized('You must be logged in');
      }

      const validStatuses = ['processing', 'confirmed', 'shipped', 'delivered', 'cancelled'];
      
      if (!validStatuses.includes(status)) {
        return ctx.badRequest('Invalid status');
      }

      // Get the order with store info
      const order = await strapi.entityService.findOne('api::order.order', orderId, {
        populate: ['store']
      });

      if (!order) {
        return ctx.notFound('Order not found');
      }

      // Verify user owns the store
      const store = await strapi.entityService.findOne('api::store.store', order.store.id, {
        populate: ['owner']
      });

      if (store?.owner?.id !== userId) {
        return ctx.forbidden('You do not have permission to update this order');
      }

      // Update order status
      const updatedOrder = await strapi.entityService.update('api::order.order', orderId, {
        data: { orderStatus: status }
      });

      return ctx.send({
        success: true,
        order: updatedOrder,
        message: `Order status updated to ${status}`
      });

    } catch (error) {
      strapi.log.error('Error updating order status:', error);
      return ctx.internalServerError('Failed to update order status');
    }
  },


  async rejectOrder(ctx) {
  try {
    const { orderId } = ctx.params;
    const { reason } = ctx.request.body;
    const userId = ctx.state.user?.id;

    if (!userId) {
      return ctx.unauthorized('You must be logged in');
    }

    if (!reason) {
      return ctx.badRequest('Rejection reason is required');
    }

    // Get the order with store info
    const order = await strapi.entityService.findOne('api::order.order', orderId, {
      populate: ['store', 'user']
    });

    if (!order) {
      return ctx.notFound('Order not found');
    }

    // Verify user owns the store
    const store = await strapi.entityService.findOne('api::store.store', order.store.id, {
      populate: ['owner']
    });

    if (store?.owner?.id !== userId) {
      return ctx.forbidden('You do not have permission to reject this order');
    }

    // Only allow rejection if order is in processing status
    if (order.orderStatus !== 'processing') {
      return ctx.badRequest(`Cannot reject order with status: ${order.orderStatus}`);
    }

    // Update order status to cancelled
    const updatedOrder = await strapi.entityService.update('api::order.order', orderId, {
      data: { 
        orderStatus: 'cancelled',
        rejectionReason: reason,
        rejectedAt: new Date()
      }
    });

    // TODO: Send email notification to customer
    // TODO: Process refund if payment was captured

    strapi.log.info(`Order ${orderId} rejected by seller. Reason: ${reason}`);

    return ctx.send({
      success: true,
      order: updatedOrder,
      message: `Order rejected: ${reason}`
    });

  } catch (error) {
    strapi.log.error('Error rejecting order:', error);
    return ctx.internalServerError('Failed to reject order');
  }
},

async updateTracking(ctx) {
  try {
    const { orderId } = ctx.params;
    const { trackingNumber } = ctx.request.body;
    const userId = ctx.state.user?.id;

    if (!userId) {
      return ctx.unauthorized('You must be logged in');
    }

    if (!trackingNumber) {
      return ctx.badRequest('Tracking number is required');
    }

    // Get the order with store info
    const order = await strapi.entityService.findOne('api::order.order', orderId, {
      populate: ['store']
    });

    if (!order) {
      return ctx.notFound('Order not found');
    }

    // Verify user owns the store
    const store = await strapi.entityService.findOne('api::store.store', order.store.id, {
      populate: ['owner']
    });

    if (store?.owner?.id !== userId) {
      return ctx.forbidden('You do not have permission to update this order');
    }

    // Update tracking number
    const updatedOrder = await strapi.entityService.update('api::order.order', orderId, {
      data: { trackingNumber }
    });

    // TODO: Send email to customer with tracking info

    return ctx.send({
      success: true,
      order: updatedOrder,
      message: 'Tracking number updated successfully'
    });

  } catch (error) {
    strapi.log.error('Error updating tracking number:', error);
    return ctx.internalServerError('Failed to update tracking number');
  }
},


  /**
   * Webhook handler for Paystack events
   */
  async paystackWebhook(ctx) {
    try {
      const hash = require('crypto')
        .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
        .update(JSON.stringify(ctx.request.body))
        .digest('hex');

      // Verify webhook signature
      if (hash !== ctx.request.headers['x-paystack-signature']) {
        return ctx.badRequest('Invalid signature');
      }

      const event = ctx.request.body;

      // Handle different event types
      switch (event.event) {
        case 'charge.success':
          strapi.log.info('Payment successful webhook:', event.data.reference);
          break;

        case 'charge.failed':
          strapi.log.warn('Payment failed webhook:', event.data.reference);
          break;

        default:
          strapi.log.info('Unhandled webhook event:', event.event);
      }

      return ctx.send({ success: true });

    } catch (error) {
      strapi.log.error('Webhook error:', error);
      return ctx.internalServerError('Webhook processing failed');
    }
  }

}));