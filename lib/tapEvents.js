// checks the queue

const EventEmitter = require('events');
const log = require('./utils/logger')('tapEvents');

// processes messages from the queue into events
module.exports = function tapEvents(queue, interval = 5000) {
  const events = new EventEmitter();
  const checkQueue = () => {
    queue.get().then(msg => {
      if (msg) {
        // TODO some sort of alert if the message is older than X seconds?
        // so that we know it's not being handled?
        const eventName = `${msg.payload.type}:${msg.payload.action}`;
        log.debug(`Send ${eventName} event for message`, msg);
        events.emit(eventName, msg);
        checkQueue();
      } else {
        setTimeout(checkQueue, interval);
      }
    });
  };
  // use setImmediate, so the aqueduct will have a chance to finish adding the pipes first
  // we'll run the checkQueue at the end of the current event loop
  if (queue) {
    setImmediate(checkQueue);
  }
  return events;
};
