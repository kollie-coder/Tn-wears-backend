// src/api/user/routes/custom.js

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/send-verification-code',
      handler: 'send-verification-code.send',
      config: {
        auth: false, // or true if token is needed
      },
    },
  ],
};
