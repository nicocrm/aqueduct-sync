class SyncEvents {
  constructor(emitter, eventConfiguration) {
    this.emitter = emitter
    this.eventConfiguration = eventConfiguration
  }

  emit(eventName, event = {}) {
    this.emitter.emit(eventName, Object.assign(event, this.eventConfiguration))
  }

  onSyncComplete() {
    this.emit(SyncEvents.SYNC_COMPLETE)
  }

  onCreated(record) {
    this.emit(SyncEvents.CREATED, {record})
  }

  onUpdated(record) {
    this.emit(SyncEvents.UPDATED, {record})
  }

  onDeleted(record) {
    this.emit(SyncEvents.DELETED, {record})
  }
}
SyncEvents.SYNC_COMPLETE = 'sync_complete'
SyncEvents.SYNC_START = 'sync_start'
SyncEvents.CREATED = 'created'
SyncEvents.UPDATED = 'updated'
SyncEvents.DELETED = 'deleted'

module.exports = SyncEvents
