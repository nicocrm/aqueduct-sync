const td = require('testdouble')
const tapEvents = require('../lib/tapEvents')

describe('TapEvents', () => {
  it('reads messages from queue', (done) => {
    const queue = {
      get: td.function()
    }
    td.when(queue.get()).thenDo(done)
    tapEvents(queue)
  })

  it('emits events using message metadata', (done) => {
    const queue = {
      get: td.function()
    }
    const msg = {
      payload: {
        type: 'Local', action: 'create'
      }
    }
    td.when(queue.get()).thenReturn(Promise.resolve(msg), Promise.resolve(undefined))
    tapEvents(queue).on('Local:create', incoming => {
      expect(incoming).to.equal(msg)
      done()
    })
  })
})
