const SyncEvents = require('../lib/syncEvents')
const EventEmitter = require('events')

describe('SyncEvents', () => {
  it('emits events', (done) => {
    const events = new EventEmitter()
    const syncEvents = new SyncEvents(events, {param: 'foo'})
    events.on(SyncEvents.SYNC_COMPLETE, evt => {
      expect(evt).to.eql({param: 'foo'})
      done()
    })
    syncEvents.onSyncComplete()
  })
})
