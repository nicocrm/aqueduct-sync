const EventEmitter = require('events')
const SyncEvents = require('../lib/syncEvents.js')
const faucet = require('../lib/faucet.js')

describe('faucet', () => {
  it('calls runFlow when onRecord returns a string', (done) => {
    const events = new EventEmitter()
    const localConnection = {}
    faucet({
      flow: events,
      runFlow: (flow) => {
        expect(flow).to.equal('MYFLOW')
        done()
      }
    })
    events.emit(SyncEvents.UPSERT_RESULT, {result: 'MYFLOW'})
  })

  it('does not call runFlow twice within same sync run', (done) => {
    const events = new EventEmitter()
    let count = 0
    const localConnection = {}
    faucet({
      flow: events,
      runFlow: (flow) => {
        count++
        if(count == 2)
          done('should not have called twice!')
      }
    })
    events.emit(SyncEvents.UPSERT_RESULT, {result: 'MYFLOW'})
    events.emit(SyncEvents.UPSERT_RESULT, {result: 'MYFLOW'})
    setTimeout(done, 25)
  })
})
