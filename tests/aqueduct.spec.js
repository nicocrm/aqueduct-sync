const td = require('testdouble')
const {Readable} = require('stream')
const Aqueduct = require('../lib/aqueduct')
const SyncEvents = require('../lib/syncEvents.js')

describe('aqueduct', () => {
  describe('start', () => {
    let syncState, remote, local, queue

    beforeEach(() => {
      syncState = {
        getSyncState: td.function('getSyncState'),
        saveSyncState: td.function('saveSyncState')
      }
      remote = { Remote: {
        create: td.function('create'),
        findUpdated: td.function('findUpdated'),
        getRevId: td.function('getRevId')
      } }
      local = { Local: {
        upsert: td.function('upsert')
      } }
      queue = {
        get: td.function('get'),
        ack: td.function('ack')
      }
      td.when(queue.get()).thenResolve(undefined)
    })

    it('does nothing, if there is no pipe', () => {
      const a = new Aqueduct(remote, local, queue, syncState)
      a.start()
    })

    it('builds flow for the pipes', () => {
      const flow = td.replace('../lib/flow'),
        Aqueduct = require('../lib/aqueduct')

      const on = td.function('on')
      td.when(flow(td.matchers.isA(Function), td.matchers.isA(Function), td.matchers.isA(Number),
        td.matchers.isA(Object))).thenReturn({on})
      const pipe = { local: 'Local', remote: 'Remote', cleanse: td.function() }
      const a = new Aqueduct(remote, local, queue, syncState)
      a.addPipe(pipe)
      a.start()
    })

    it('sync remote objects and updates sync state', (done) => {
      const SYNC_STATE = 'sync-state'
      const NEW_SYNC_STATE = 'new-sync-state'
      const REMOTE_OBJ = { key: 'remote' }
      const LOCAL_OBJ = { key: 'local' }

      const fakeStream = new Readable({read: () => null, objectMode: true})
      fakeStream.push(REMOTE_OBJ)
      fakeStream.push(null)
      td.when(remote.Remote.findUpdated(SYNC_STATE)).thenReturn(fakeStream)
      td.when(remote.Remote.getRevId(REMOTE_OBJ)).thenReturn(NEW_SYNC_STATE)
      const syncState = {
        getSyncState: td.function(),
        saveSyncState: td.function('saveSyncState')
      }
      td.when(syncState.getSyncState('Local')).thenReturn(Promise.resolve(SYNC_STATE))
      const pipe = {
        remote: 'Remote',
        local: 'Local',
        cleanse: td.function(),
        fields: ['key']
      }
      td.when(pipe.cleanse(local, REMOTE_OBJ)).thenReturn(Promise.resolve(LOCAL_OBJ))
      td.when(local.Local.upsert(LOCAL_OBJ)).thenReturn(Promise.resolve({}))
      const a = new Aqueduct(remote, local, queue, syncState)
      a.addPipe(pipe)
      a.on(SyncEvents.SYNC_COMPLETE, (evt) => {
        td.verify(syncState.saveSyncState('Local', NEW_SYNC_STATE))
        expect(evt.local).to.equal('Local')
        done()
      })
      a.start()
    })

    it('starts tap and checks for queue message at interval', (done) => {
      const a = new Aqueduct({}, {}, queue, {})
      td.when(queue.get()).thenDo(done)
      a.start()
    })

    it('calls prepare when creating records', (done) => {
      const pipe = {
        remote: 'Remote',
        local: 'Local',
        prepare: td.function(),
        fields: ['field']
      }
      const msg = { type: 'Local', action: 'create', data: 'bla bla bla' }
      td.when(syncState.getSyncState('Local')).thenReturn(new Promise(() => null))
      td.when(queue.get()).thenReturn(Promise.resolve(msg), Promise.resolve(undefined))
      td.when(pipe.prepare('bla bla bla'))
        .thenReturn({field: 'prepared data', other: 'something to discard'})
      local.Local.upsert = () => new Promise(() => null)
      remote.Remote.create = data => {
        expect(data).to.eql({field: 'prepared data'})
        done()
        return new Promise(() => null)
      }
      const a = new Aqueduct(remote, local, queue, syncState)
      a.addPipe(pipe)
      a.start()
    })

    it('upserts on local connection with result of create', (done) => {
      const pipe = {
        remote: 'Remote',
        local: 'Local',
        cleanse: td.function(),
        fields: ['field']
      }
      const msg = { type: 'Local', action: 'create', data: {field: 'bla bla bla', something_else: 'foo'} }
      // a promise that doesn't resolve so we don't try to pull stuff down
      td.when(syncState.getSyncState('Local')).thenReturn(new Promise(() => null))
      td.when(queue.get()).thenReturn(Promise.resolve(msg), Promise.resolve(undefined))
      td.when(remote.Remote.create({field: 'bla bla bla'})).thenResolve({field: 'result from create'})
      td.when(pipe.cleanse(local, {field: 'result from create'})).thenReturn({field: 'cleansed result from create'})
      local.Local.upsert = rec => {
        // td.verify(pipe.cleanse(local, {field: 'result from create'}))
        expect(rec).to.eql({field: 'cleansed result from create'})
        done()
        return new Promise(() => ({}))
      }
      const a = new Aqueduct(remote, local, queue, syncState)
      a.addPipe(pipe)
      a.start()
    })
  })
})
