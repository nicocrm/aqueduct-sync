const SyncEvents = require('../lib/syncEvents')

describe('SyncEvents', () => {
  it('emits events', (done) => {
    const events = new SyncEvents()
    events.on(SyncEvents.SYNC_COMPLETE, done)
    events.onSyncComplete()
  })
})
