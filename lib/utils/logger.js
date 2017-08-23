const loglevel = require('loglevel')

let logger = loglevel.getLogger('aqueduct-sync'),
  useLoggerForDebug = false

function loggerFactory(name, module) {
  const debug = require('debug')('aqueduct:' + name)
  const log = loglevel.getLogger('aqueduct-sync')
  const formatMessage = message => name + (module ? ` (${module})` : '') + ': ' + message
  return {
    error: function(message, ...rest) {
      log.error(formatMessage(message), ...rest)
    },
    info: function(message, ...rest) {
      log.info(formatMessage(message), ...rest)
    },
    debug: function(message, ...rest) {
      if(useLoggerForDebug) {
        log.debug(formatMessage(message), ...rest)
      } else {
        debug((module ? `${module}:` : '') + message, ...rest)
      }
    }
  }
}
loggerFactory.setLogger = function(customLogger, useForDebug) {
  logger = customLogger
  useLoggerForDebug = useForDebug
}

module.exports = loggerFactory
