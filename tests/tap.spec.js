const td = require('testdouble')
const tap = require('../lib/tap')

describe('Tap', () => {
  it('reads messages from queue', (done) => {
    const queue = {
      get: td.function()
    }
    td.when(queue.get()).thenDo(done)
    tap(queue)
  })

  it('emits events using message metadata', (done) => {
    const queue = {
      get: td.function()
    }
    const msg = {
      type: 'Local', action: 'create'
    }
    td.when(queue.get()).thenReturn(Promise.resolve(msg), Promise.resolve(undefined))
    tap(queue).on('Local:create', incoming => {
      expect(incoming).to.equal(msg)
      done()
    })
  })
})
