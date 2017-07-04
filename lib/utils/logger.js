
module.exports = function(name) {
  const debug = require('debug')('aqueduct:' + name)
  return {
    error: function(message, ...rest) {
      console.error(name + ': ' + message, ...rest)
    },
    info: function(message, ...rest) {
      console.info(name + ': ' + message, ...rest)
    },
    debug: function(...rest) {
      debug(...rest)
    }
  }
}
