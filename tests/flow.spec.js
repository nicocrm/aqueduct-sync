const flow = require('../lib/flow')
const td = require('testdouble')
const {Readable} = require('stream')

describe('flow', () => {
  let logger

  beforeEach(() => {
    logger = {
      debug: td.function('debug'),
      error: td.function('error'),
      info: td.function('info')
    }
  })

  it('returns a promise that resolves when the stream is done reading', () => {
    const findUpdated = td.function()
    const upsert = td.function()
    const fakeStream = new Readable({read: () => null, objectMode: true})
    fakeStream.push(null)
    td.when(findUpdated()).thenReturn(Promise.resolve(fakeStream))
    return flow(findUpdated, upsert, 60000, logger)
  })

  it('upserts records read from the stream', () => {
    const findUpdated = td.function()
    const upsert = td.function()
    const fakeStream = new Readable({read: () => null, objectMode: true})
    fakeStream.push('REMOTE')
    fakeStream.push(null)
    td.when(findUpdated()).thenReturn(Promise.resolve(fakeStream))
    return flow(findUpdated, upsert, 60000, logger).then(() => {
      td.verify(upsert('REMOTE'))
    })
  })

  it.skip('reports errors from the stream', () => {

  })
})
