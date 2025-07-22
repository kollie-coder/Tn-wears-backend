module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/verify-email',
      handler: 'verify-email.verify',
      config: {
        auth: false,
      },
    },
  ],
};
