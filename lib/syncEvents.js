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

  onCreated(source, record) {
    this.emit(SyncEvents.CREATED, {source, record})
  }

  onUpdated(source, record) {
    this.emit(SyncEvents.UPDATED, {source, record})
  }

  onDeleted(source, record) {
    this.emit(SyncEvents.DELETED, {source, record})
  }
}
SyncEvents.SYNC_COMPLETE = 'sync_complete'
SyncEvents.CREATED = 'created'
SyncEvents.UPDATED = 'updated'
SyncEvents.DELETED = 'deleted'

module.exports = SyncEvents
