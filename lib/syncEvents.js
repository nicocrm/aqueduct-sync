class SyncEvents {
  constructor(emitter, eventConfiguration) {
    this.emitter = emitter
    this.eventConfiguration = eventConfiguration
    // attach a handler to the underlying emitter
    this.on = emitter.on.bind(emitter)
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

  onUpsertResult(record, result) {
    this.emit(SyncEvents.UPSERT_RESULT, {record, result})
  }
}
SyncEvents.SYNC_COMPLETE = 'sync_complete'
SyncEvents.SYNC_START = 'sync_start'
SyncEvents.CREATED = 'created'
SyncEvents.UPDATED = 'updated'
SyncEvents.DELETED = 'deleted'
SyncEvents.UPSERT_RESULT = 'upsert_result'

module.exports = SyncEvents
