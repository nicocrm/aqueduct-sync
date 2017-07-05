const EventEmitter = require('events')
const td = require('testdouble')
const tap = require('../lib/tap')
const log = require('../lib/utils/logger')('testing')

describe('Tap', () => {
  it('handles create events', () => {
    const ack = () => Promise.resolve()
    const events = new EventEmitter()
    const pipe = {
      local: 'Local',
      cleanse: x => x,
      prepare: x => x
    }
    const upsert = () => Promise.resolve()
    const create = td.function()
    td.when(create('foo')).thenResolve({})
    tap(events, pipe, upsert, create, ack, log)
    events.emit('Local:create', {data: 'foo'})
    td.explain(create).callCount.should.equal(1)
  })

  it('calls upsert with result of create', (done) => {
    const ack = () => Promise.resolve()
    const events = new EventEmitter()
    const pipe = {
      local: 'Local',
      cleanse: x => x,
      prepare: x => x
    }
    const upsert = data => {
      data.should.eql('result from create')
      done()
      return Promise.resolve()
    }
    const create = () => Promise.resolve('result from create')
    tap(events, pipe, upsert, create, ack, log)
    events.emit('Local:create', {data: 'foo'})
  })

  it('calls ack with original message', (done) => {
    const events = new EventEmitter()
    const pipe = {
      local: 'Local',
      cleanse: x => x,
      prepare: x => x
    }
    const upsert = () => Promise.resolve()
    const create = () => Promise.resolve()
    const msg = { data: 'foo' }
    const ack = data => {
      expect(data).to.equal(msg)
      done()
    }
    tap(events, pipe, upsert, create, ack, log)
    events.emit('Local:create', msg)
  })
})
