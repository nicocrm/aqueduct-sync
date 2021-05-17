const EventEmitter = require('events')
const SyncEvents = require('../lib/syncEvents.js')
const faucet = require('../lib/faucet.js')

describe('faucet', () => {
  it('calls runFlow when onRecord returns a string', (done) => {
    const events = new EventEmitter()
    faucet({
      flow: events,
      runFlow: (flow) => {
        expect(flow).to.equal('MYFLOW')
        done()
      },
    })
    events.emit(SyncEvents.UPSERT_RESULT, {result: 'MYFLOW'})
  })

  it('does not call runFlow twice within same sync run', (done) => {
    const events = new EventEmitter()
    let count = 0
    faucet({
      flow: events,
      runFlow: (flow) => {
        count++
        if (count === 2) done('should not have called twice!')
      },
    })
    events.emit(SyncEvents.UPSERT_RESULT, {result: 'MYFLOW'})
    events.emit(SyncEvents.UPSERT_RESULT, {result: 'MYFLOW'})
    setTimeout(done, 25)
  })

  it('adds record back to the queue when faucet returns a number', (done) => {
    const events = new EventEmitter()
    faucet({
      flow: events,
      onReread: (record, delay) => {
        expect(record).to.equal('RECORD')
        expect(delay).to.equal(33)
        done()
      },
    })

    events.emit(SyncEvents.UPSERT_RESULT, {record: 'RECORD', result: 33})
  })
})
