const flow = require('../lib/flow')
const td = require('testdouble')
const {Readable} = require('stream')

describe('flow', () => {
  it('calls findUpdated on the remote connection', () => {
    const findUpdated = td.function()
    const upsert = td.function()
    return flow(findUpdated, upsert, () => null, 60000).then(null, () => null).then(() => {
      td.verify(findUpdated())
    })
  })

  it('returns a promise that resolves when the stream is done reading', () => {
    const findUpdated = td.function()
    const upsert = td.function()
    const fakeStream = new Readable({read: () => null, objectMode: true})
    fakeStream.push(null)
    td.when(findUpdated()).thenReturn(fakeStream)
    return flow(findUpdated, upsert, () => null, 60000)
  })

  it('upserts records read from the stream', () => {
    const findUpdated = td.function()
    const upsert = td.function()
    const fakeStream = new Readable({read: () => null, objectMode: true})
    fakeStream.push('REMOTE')
    fakeStream.push(null)
    td.when(findUpdated()).thenReturn(fakeStream)
    return flow(findUpdated, upsert, 60000).then(() => {
      td.verify(upsert('REMOTE'))
    })
  })

  it.skip('reports errors from the stream', () => {

  })
})
