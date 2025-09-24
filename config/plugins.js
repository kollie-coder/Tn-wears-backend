const path = require('path');

module.exports = ({ env }) => ({
 "users-permissions": {
    config: {
       providers: {
        google: {
          clientId: env('GOOGLE_CLIENT_ID'),
          clientSecret: env('GOOGLE_CLIENT_SECRET'),
          redirectUri: "/api/connect/google/callback",
        },
      },
      register: {
        allowedFields: ["firstname", "lastname", "contact", "userType"],
      },
    },
  },
  email: {
    config: {
      provider: path.resolve('./src/providers/custom-email-provider'),
      providerOptions: {
        transport: {
          service: 'gmail',
        auth: {
          user: env('BREVO_SMTP_USERNAME'),
          pass: env('BREVO_SMTP_PASSWORD'),
        },
      },
    },
      settings: {
        defaultFrom: 'BREVO_DEFAULT_FROM',
        defaultReplyTo: 'BREVO_DEFAULT_TO',
      },
    },
  },
});
