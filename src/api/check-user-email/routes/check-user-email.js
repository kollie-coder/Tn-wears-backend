module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/check-user-email',
      handler: 'check-user-email.find',
      config: {
        auth: false, // make it public
      },
    },
  ],
};
