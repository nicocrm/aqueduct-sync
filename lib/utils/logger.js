
module.exports = function(name, module) {
  const debug = require('debug')('aqueduct:' + name)
  const formatMessage = message => name + (module ? ` (${module})` : '') + ': ' + message
  return {
    error: function(message, ...rest) {
      console.error(formatMessage(message), ...rest)
    },
    info: function(message, ...rest) {
      console.info(formatMessage(message), ...rest)
    },
    debug: function(message, ...rest) {
      debug((module ? `${module} :` : '') + message, ...rest)
    }
  }
}
