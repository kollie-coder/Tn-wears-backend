const nodemailer = require('nodemailer');

module.exports = {
  init(providerOptions) {
    const transporter = nodemailer.createTransport(providerOptions.transport);

    return {
      async send({ to, from, subject, text, html }) {
        await transporter.sendMail({
          from,
          to,
          subject,
          text,
          html,
        });
      },
    };
  },
};
