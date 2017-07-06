const EventEmitter = require('events')
const td = require('testdouble')
const SyncEvents = require('../lib/syncEvents.js')
const tap = require('../lib/tap')
const log = require('../lib/utils/logger')('testing')

describe('Tap', () => {
  let syncEvents, syncEventsEmitter

  beforeEach(() => {
    syncEventsEmitter = new EventEmitter()
    syncEvents = new SyncEvents(syncEventsEmitter)
  })

  it('handles create events', () => {
    const ack = () => Promise.resolve()
    const events = new EventEmitter()
    const pipe = {
      local: 'Local',
      cleanse: x => Promise.resolve(x),
      prepare: x => x
    }
    const upsert = () => Promise.resolve()
    const remote = { create: td.function() }
    td.when(remote.create('foo')).thenResolve({})
    tap(events, pipe, upsert, remote, ack, log, syncEvents)
    events.emit('Local:create', {data: 'foo'})
    td.explain(remote.create).callCount.should.equal(1)
  })

  it('handles update events', () => {
    const ack = () => Promise.resolve()
    const events = new EventEmitter()
    const pipe = {
      local: 'Local',
      cleanse: x => Promise.resolve(x),
      prepare: x => x
    }
    const upsert = () => Promise.resolve()
    const remote = { update: td.function() }
    td.when(remote.update('foo')).thenResolve({})
    tap(events, pipe, upsert, remote, ack, log, syncEvents)
    events.emit('Local:update', {data: 'foo'})
    td.explain(remote.update).callCount.should.equal(1)
  })

  it('calls upsert with result of create', (done) => {
    const ack = () => Promise.resolve()
    const events = new EventEmitter()
    const pipe = {
      local: 'Local',
      cleanse: x => Promise.resolve(x),
      prepare: x => x
    }
    const upsert = (data, id) => {
      data.should.eql('result from create')
      expect(id, 'should pass identifier from message').to.be.ok.and.to.equal('id')
      done()
      return Promise.resolve()
    }
    const remote = { create: () => Promise.resolve('result from create') }
    tap(events, pipe, upsert, remote, ack, log, syncEvents)
    events.emit('Local:create', {data: 'foo', identifier: 'id'})
  })

  it('calls ack with original message', (done) => {
    const events = new EventEmitter()
    const pipe = {
      local: 'Local',
      cleanse: x => Promise.resolve(x),
      prepare: x => x
    }
    const upsert = () => Promise.resolve()
    const remote = { create: () => Promise.resolve() }
    const msg = { data: 'foo' }
    const ack = data => {
      expect(data).to.equal(msg)
      done()
    }
    tap(events, pipe, upsert, remote, ack, log, syncEvents)
    events.emit('Local:create', msg)
  })

  it('emits created event', (done) => {
    const ack = () => Promise.resolve()
    const events = new EventEmitter()
    const pipe = {
      local: 'Local',
      cleanse: x => Promise.resolve(x),
      prepare: x => x
    }
    const upsert = () => Promise.resolve()
    const remote = { create: td.function() }
    td.when(remote.create('foo')).thenResolve({created: 1})
    tap(events, pipe, upsert, remote, ack, log, syncEvents)
    const onCreated = td.function()
    syncEventsEmitter.on(SyncEvents.CREATED, onCreated)
    events.emit('Local:create', {data: 'foo'})
    setImmediate(() => {
      td.verify(onCreated({ record: {created: 1} }))
      done()
    })
  })

  it('does not ack message and log an error if there is an error', (done) => {
    const events = new EventEmitter()
    const pipe = {
      local: 'Local',
      cleanse: x => Promise.resolve(x),
      prepare: x => x
    }
    const upsert = () => Promise.resolve()
    const remote = { create: () => Promise.reject(new Error('err')) }
    const msg = { data: 'foo' }
    const ack = data => {
      done('event should not be ack')
    }
    log.error = (err) => {
      expect(err.message).to.equal('err')
      done()
    }
    tap(events, pipe, upsert, remote, ack, log, syncEvents)
    events.emit('Local:create', msg)
  })
})
