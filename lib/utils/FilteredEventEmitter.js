const R = require('ramda')
const EventEmitter = require('events')

class FilteredEventEmitter extends EventEmitter {
  on(filter, eventName, handler) {
    if(!handler) {
      return super.on(filter, eventName)
    } else {
      const pred = R.allPass(R.map(R.eqProps, R.keys(filter)))(filter)
      return super.on(eventName, evt => pred(evt) && handler(evt))
    }
  }
}
module.exports = FilteredEventEmitter
