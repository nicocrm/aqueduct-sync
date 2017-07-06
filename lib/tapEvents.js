// checks the queue

const EventEmitter = require('events')
const log = require('./utils/logger')('tapEvents')

// processes messages from the queue into events
module.exports = function tapEvents(queue, interval = 5000) {
  const events = new EventEmitter()
  const checkQueue = () => {
    log.debug('check queue')
    queue.get().then(msg => {
      if(msg) {
        log.debug('got message')
        const eventName = `${msg.type}:${msg.action}`
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
