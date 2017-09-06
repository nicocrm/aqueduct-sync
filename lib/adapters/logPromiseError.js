module.exports = function buildLogPromiseError(logger) {
  return function logPromiseError(promise) {
    return promise.catch(err => {
      logger.error(err)
      if(logger.trace)
        logger.trace(err)
    })
  }
}
