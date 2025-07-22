module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/resend-code',
      handler: 'resend-code.resend',
      config: {
        auth: false,
      },
    },
  ],
};
