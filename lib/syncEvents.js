const EventEmitter = require('events')

class SyncEvents {
  constructor() {
    this.events = new EventEmitter()
  }

  /**
   * Attach an event handler
   */
  on(event, listener) {
    return this.events.on(event, listener)
  }

  onSyncComplete() {
    this.events.emit(SyncEvents.SYNC_COMPLETE)
  }
}
SyncEvents.SYNC_COMPLETE = 'sync_complete'

module.exports = SyncEvents
