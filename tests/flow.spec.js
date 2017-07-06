const flow = require('../lib/flow')
const td = require('testdouble')
const {Readable} = require('stream')
const SyncEvents = require('../lib/syncEvents.js')

describe('flow', () => {
  let logger

  beforeEach(() => {
    logger = {
      debug: td.function('debug'),
      error: td.function('error'),
      info: td.function('info')
    }
  })

  it('returns an event emitter that emits flow event when the flow runs', (done) => {
    const findUpdated = td.function()
    const upsert = td.function()
    const fakeStream = new Readable({read: () => null, objectMode: true})
    fakeStream.push(null)
    td.when(findUpdated()).thenReturn(Promise.resolve(fakeStream))
    flow(findUpdated, upsert, 60000, logger).on(SyncEvents.SYNC_COMPLETE, () => {
      done()
    })
  })

  it('upserts records read from the stream', (done) => {
    const findUpdated = td.function()
    const upsert = td.function()
    const fakeStream = new Readable({read: () => null, objectMode: true})
    fakeStream.push('REMOTE')
    fakeStream.push(null)
    td.when(findUpdated()).thenReturn(Promise.resolve(fakeStream))
    td.when(upsert('REMOTE')).thenResolve()
    td.config({ignoreWarnings: true})
    flow(findUpdated, upsert, 60000, logger).on(SyncEvents.SYNC_COMPLETE, () => {
      td.verify(upsert('REMOTE'))
      done()
    })
  })

  it.skip('reports errors from the stream', () => {

  })

  it.skip('reports errors from upsert', () => {

  })
})
