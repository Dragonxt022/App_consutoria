const asyncHandler = require('./AsyncHandler');

function routeHandler(target, methodName) {
  return asyncHandler((req, res, next) => target[methodName](req, res, next));
}

module.exports = routeHandler;
