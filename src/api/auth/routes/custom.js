module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/auth/google-login',
      handler: 'auth.googleLogin',
      config: {
        auth: false,
      },
    },
  ],
};
