const loglevel = require('loglevel')

let logger = loglevel.getLogger('aqueduct-sync'),
  useLoggerForDebug = false

function loggerFactory(name, module) {
  const debug = require('debug')('aqueduct:' + name)
  const formatMessage = message => name + (module ? ` (${module})` : '') + ': ' + message
  return {
    error: function(message, ...rest) {
      logger.error(formatMessage(message), ...rest)
    },
    info: function(message, ...rest) {
      logger.info(formatMessage(message), ...rest)
    },
    debug: function(message, ...rest) {
      if(useLoggerForDebug) {
        logger.debug(formatMessage(message), ...rest)
      } else {
        debug((module ? `${module}:` : '') + message, ...rest)
      }
    },
    trace: logger.trace
  }
}
loggerFactory.setLogger = function(customLogger, useForDebug) {
  logger = customLogger
  useLoggerForDebug = useForDebug
}

module.exports = loggerFactory
