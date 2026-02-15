'use strict';

const axios = require('axios');

/**
 * order controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::order.order', ({ strapi }) => ({
  
  /**
   * Verify Paystack payment and create order
   */
//   async verifyPayment(ctx) {
//     try {
//       const { reference, orderDetails } = ctx.request.body;
//       const userId = ctx.state.user?.id;

//       // Validate input
//       if (!reference || !orderDetails) {
//         return ctx.badRequest('Missing payment reference or order details');
//       }

//       // Verify payment with Paystack
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

//       // Check if payment was successful
//       if (paymentData.status !== 'success') {
//         return ctx.badRequest('Payment verification failed', {
//           status: paymentData.status,
//           message: 'Payment was not successful'
//         });
//       }

//       // Verify amount matches (Paystack returns amount in kobo)
//       const expectedAmount = orderDetails.totalToPay * 100;
//       if (paymentData.amount !== expectedAmount) {
//         strapi.log.error('Amount mismatch:', {
//           expected: expectedAmount,
//           received: paymentData.amount
//         });
//         return ctx.badRequest('Payment amount mismatch');
//       }

//       // Check if order with this payment reference already exists
//       const existingOrder = await strapi.db.query('api::order.order').findOne({
//         where: { paymentReference: reference }
//       });

//       if (existingOrder) {
//         return ctx.badRequest('Order already exists for this payment reference');
//       }

//       // Calculate estimated delivery date (7 days from now)
//       const estimatedDeliveryDate = new Date();
//       estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + 7);

//       // Create order in database
//       const order = await strapi.entityService.create('api::order.order', {
//         data: {
//           orderReference: `ORD-${Date.now()}`,
//           items: orderDetails.items,
//           subtotal: orderDetails.subtotal,
//           deliveryFee: orderDetails.deliveryFee,
//           tip: orderDetails.tip || 0,
//           totalAmount: orderDetails.totalToPay,
//           paymentReference: reference,
//           paymentStatus: 'paid',
//           orderStatus: 'processing',
//           deliveryAddress: orderDetails.address,
//           customerEmail: paymentData.customer.email,
//           customerName: paymentData.customer.customer_code,
//           paymentMethod: paymentData.channel,
//           estimatedDeliveryDate: estimatedDeliveryDate,
//           user: userId || null,
//           publishedAt: new Date() // Auto-publish
//         }
//       });

//       // Log successful order creation
//       strapi.log.info('Order created successfully:', {
//         orderId: order.id,
//         orderReference: order.orderReference,
//         paymentReference: reference
//       });

//       // Return success response
//       return ctx.send({
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
//           estimatedDeliveryDate: order.estimatedDeliveryDate
//         }
//       });

//     } catch (error) {
//       strapi.log.error('Payment verification error:', error);

//       // Handle Paystack API errors
//       if (error.response) {
//         return ctx.badRequest('Payment verification failed', {
//           message: error.response.data.message || 'Unable to verify payment with Paystack'
//         });
//       }

//       // Handle other errors
//       return ctx.internalServerError('An error occurred while processing your order', {
//         error: error.message
//       });
//     }
//   },


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
      const existingOrder = await strapi.db.query('api::order.order').findOne({
        where: { paymentReference: reference }
      });

      if (existingOrder) {
        console.log('Order already exists:', existingOrder.id);
        return ctx.send({
          success: true,
          message: 'Order already exists',
          order: {
            id: existingOrder.id,
            orderReference: existingOrder.orderReference,
            totalAmount: existingOrder.totalAmount,
            paymentStatus: existingOrder.paymentStatus,
            orderStatus: existingOrder.orderStatus,
            items: existingOrder.items,
            subtotal: existingOrder.subtotal,
            deliveryFee: existingOrder.deliveryFee,
            tip: existingOrder.tip,
            estimatedDeliveryDate: existingOrder.estimatedDeliveryDate
          }
        });
      }

      // Calculate estimated delivery date (7 days from now)
      const estimatedDeliveryDate = new Date();
      estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + 7);

      console.log('Creating order in database...');
      
      // Create order in database
      const order = await strapi.entityService.create('api::order.order', {
        data: {
          orderReference: `ORD-${Date.now()}`,
          items: orderDetails.items,
          subtotal: parseFloat(orderDetails.subtotal),
          deliveryFee: parseFloat(orderDetails.deliveryFee),
          tip: parseFloat(orderDetails.tip || 0),
          totalAmount: parseFloat(orderDetails.totalToPay),
          paymentReference: reference,
          paymentStatus: 'paid',
          orderStatus: 'processing',
          deliveryAddress: orderDetails.address,
          customerEmail: paymentData.customer?.email || orderDetails.email,
          customerName: paymentData.customer?.customer_code,
          paymentMethod: paymentData.channel,
          estimatedDeliveryDate: estimatedDeliveryDate,
          user: userId || null,
          publishedAt: new Date()
        }
      });

      console.log('Order created successfully:', order.id);

      // Return success response with all needed data
      const responseData = {
        success: true,
        message: 'Payment verified and order created successfully',
        order: {
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
          createdAt: order.createdAt
        }
      };

      console.log('Sending response:', JSON.stringify(responseData, null, 2));
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
   * Get user's orders
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
        populate: ['user']
      });

      return ctx.send({
        success: true,
        orders
      });

    } catch (error) {
      strapi.log.error('Error fetching user orders:', error);
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
        populate: ['user']
      });

      if (!order) {
        return ctx.notFound('Order not found');
      }

      // Check if user owns this order
      if (userId && order.user?.id !== userId) {
        return ctx.forbidden('You do not have permission to view this order');
      }

      return ctx.send({
        success: true,
        order
      });

    } catch (error) {
      strapi.log.error('Error fetching order:', error);
      return ctx.internalServerError('Unable to fetch order');
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
          // Additional logic if needed
          break;

        case 'charge.failed':
          strapi.log.warn('Payment failed webhook:', event.data.reference);
          // Update order status if needed
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