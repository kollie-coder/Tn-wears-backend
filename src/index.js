'use strict';
const { Server } = require('socket.io');

module.exports = {
  register() {},

  bootstrap({ strapi }) {
    const io = new Server(strapi.server.httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    strapi.io = io;

    const onlineUsers = new Map();

    io.on('connection', (socket) => {
      console.log('Socket connected:', socket.id);

      socket.on('user_connected', (userId) => {
        onlineUsers.set(String(userId), socket.id);
        socket.join(`user_${userId}`);
        console.log(`User ${userId} online`);
      });

      socket.on('send_message', async (data) => {
        const { conversationId, senderId, content } = data;

        try {
          // 1. Save message to DB
          const message = await strapi.entityService.create(
            'api::message.message',
            {
              data: {
                content,
                sender: senderId,
                conversation: conversationId,
                readBy: [senderId],
              },
              populate: {
                sender: {
                  fields: ['id', 'firstname', 'lastname', 'username', 'userType'],
                  populate: {
                    stores: {
                      fields: ['storeName'],
                      populate: { storeImage: true },
                    },
                  },
                },
              },
            }
          );

          // 2. Update conversation lastMessage
          await strapi.entityService.update(
            'api::conversation.conversation',
            conversationId,
            {
              data: {
                lastMessage: content,
                lastMessageAt: new Date(),
              },
            }
          );

          // 3. Get participants
          const conversation = await strapi.entityService.findOne(
            'api::conversation.conversation',
            conversationId,
            { populate: ['participants'] }
          );

          // 4. Emit to all participants
          conversation.participants.forEach((participant) => {
            io.to(`user_${participant.id}`).emit('new_message', {
              message,
              conversationId,
            });
          });

        } catch (err) {
          console.error('send_message error:', err);
          socket.emit('message_error', { error: 'Failed to send message' });
        }
      });

      socket.on('typing', ({ conversationId, senderId, recipientId }) => {
        io.to(`user_${recipientId}`).emit('user_typing', {
          conversationId,
          senderId,
        });
      });

      socket.on('stop_typing', ({ conversationId, recipientId }) => {
        io.to(`user_${recipientId}`).emit('user_stop_typing', {
          conversationId,
        });
      });

      socket.on('mark_read', async ({ conversationId, userId }) => {
        try {
          const unread = await strapi.entityService.findMany(
            'api::message.message',
            {
              filters: { conversation: { id: conversationId } },
              populate: ['readBy'],
            }
          );

          const toUpdate = unread.filter(
            (msg) => !msg.readBy?.some((u) => u.id === userId)
          );

          await Promise.all(
            toUpdate.map((msg) =>
              strapi.entityService.update('api::message.message', msg.id, {
                data: {
                  readBy: [...msg.readBy.map((u) => u.id), userId],
                },
              })
            )
          );

          const conversation = await strapi.entityService.findOne(
            'api::conversation.conversation',
            conversationId,
            { populate: ['participants'] }
          );

          conversation.participants.forEach((p) => {
            io.to(`user_${p.id}`).emit('messages_read', {
              conversationId,
              readBy: userId,
            });
          });

        } catch (err) {
          console.error('mark_read error:', err);
        }
      });

      socket.on('disconnect', () => {
        onlineUsers.forEach((socketId, userId) => {
          if (socketId === socket.id) onlineUsers.delete(userId);
        });
        console.log('Socket disconnected:', socket.id);
      });
    });
  },
};