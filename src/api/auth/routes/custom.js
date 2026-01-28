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

    // EMAIL CHANGE ROUTES (All require authentication)
    {
      method: 'POST',
      path: '/auth/change-email',
      handler: 'auth.changeEmail',
      config: {
        // Authentication required (default)
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/auth/verify-email-change',
      handler: 'auth.verifyEmailChange',
      config: {
        // Authentication required (default)
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/auth/resend-email-verification',
      handler: 'auth.resendEmailVerification',
      config: {
        // Authentication required (default)
        policies: [],
        middlewares: [],
      },
    },

     // TWO-FACTOR AUTHENTICATION ROUTES
    {
      method: 'POST',
      path: '/auth/two-factor/enable',
      handler: 'auth.enable2FA',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/auth/two-factor/change',
      handler: 'auth.change2FA',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/auth/two-factor/disable',
      handler: 'auth.disable2FA',
      config: {
        policies: [],
        middlewares: [],
      },
    },

    {
      method: 'DELETE',
      path: '/auth/delete-account',
      handler: 'auth.deleteAccount',
      config: {
        policies: [],
        middlewares: [],
      },
    }
    
  ],
};
