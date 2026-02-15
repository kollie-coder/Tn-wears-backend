'use strict';

module.exports = (config, { strapi }) => {
  return async (ctx, next) => {
    const start = Date.now();
    
    await next();
    
    const delta = Math.ceil(Date.now() - start);
    
    if (ctx.url.includes('/orders/')) {
      strapi.log.info(`${ctx.method} ${ctx.url} - ${ctx.status} - ${delta}ms`);
    }
  };
};