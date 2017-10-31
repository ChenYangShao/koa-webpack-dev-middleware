'use strict';

const expressMiddleware = require('webpack-dev-middleware');

function middleware(doIt, req, res) {
  const { end: originalEnd } = res;

  return (done) => {
    res.end = function end() {
      originalEnd.apply(this, arguments);
      done(null, 0);
    };
    doIt(req, res, () => {
      done(null, 1);
    })
  };
}

module.exports = (compiler, option) => {
  const doIt = expressMiddleware(compiler, option);

  async function koaMiddleware(next) {
    const ctx = this;
    const { req } = ctx;
    const locals = ctx.locals || ctx.state;

    ctx.webpack = doIt;

    const runNext = await middleware(doIt, req, {
      end(content) {
        ctx.body = content;
      },
      locals,
      setHeader() {
        ctx.set.apply(ctx, arguments);
      },
    });

    if (runNext) {
      try {
        await next();
      } catch (err) {
        ctx.body = {message: err.message}
        ctx.status = err.status || 500
      }
    }
  }

  Object.keys(doIt).forEach(key => {
    koaMiddleware[key] = doIt[key];
  });

  return koaMiddleware;
};
