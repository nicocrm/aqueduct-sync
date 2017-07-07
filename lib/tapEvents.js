// checks the queue

const EventEmitter = require('events')
const log = require('./utils/logger')('tapEvents')

// processes messages from the queue into events
module.exports = function tapEvents(queue, interval = 5000) {
  const events = new EventEmitter()
  const checkQueue = () => {
    queue.get().then(msg => {
      if(msg) {
        const eventName = `${msg.payload.type}:${msg.payload.action}`
        log.debug(`Send ${eventName} event for message`, msg)
        events.emit(eventName, msg)
        checkQueue()
      } else {
        setTimeout(checkQueue, interval)
      }
    })
  }
  setImmediate(checkQueue)
  return events
}
