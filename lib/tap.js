// checks the queue

const EventEmitter = require('events')

module.exports = function tap(queue, interval = 5000) {
  const events = new EventEmitter()
  const checkQueue = () => {
    queue.get().then(msg => {
      if(msg) {
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
