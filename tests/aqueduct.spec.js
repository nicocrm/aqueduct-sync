const td = require('testdouble')
const {Readable} = require('stream')
const Aqueduct = require('../lib/aqueduct')
const SyncEvents = require('../lib/syncEvents.js')

describe('aqueduct', () => {
  describe('start', () => {
    let syncState, remote, local, queue

    const localCollection = definition => ({
      update: td.function('update'),
      upsert: td.function('upsert'),
      find: td.function('find'),
      get: td.function('get'),
      addOrUpdateChildInCollection: td.function(),
      removeChildFromCollection: td.function(),
      getKeyField: () => 'Id',
      getLocalKeyField: () => '_id',
      ...definition
    })

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
      local = { Local: localCollection({}) }
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

      const on = () => ({on})
      td.when(flow(td.matchers.contains({
        runNow: true
      }))).thenReturn({on})
      const pipe = { local: 'Local', remote: 'Remote', cleanse: td.function() }
      const a = new Aqueduct(remote, local, queue, syncState)
      a.addPipe(pipe)
      a.start()
      td.explain(flow).callCount.should.equal(1)
    })

    it('builds faucet (and flow for the faucet) when configured', () => {
      const flow = td.replace('../lib/flow'),
        faucet = td.replace('../lib/faucet'),
        Aqueduct = require('../lib/aqueduct')

      const on = () => ({on})
      td.when(flow(td.matchers.anything())).thenReturn({on})
      const config = {
        remote: 'Remote',
        onRecord: () => '',
        name: 'foo'
      }
      const a = new Aqueduct(remote, local, queue, syncState)
      a.addFaucet(config)
      a.start()
      td.verify(faucet(td.matchers.argThat(arg => {
        expect(arg).to.have.property('flow').that.has.property('on')
        expect(arg).to.have.property('runFlow').that.is.a('function')
        return true
      })))
    })

    it('calls faucet onRecord and updates sync state', (done) => {
      const SYNC_STATE = 'sync-state'
      const NEW_SYNC_STATE = 'new-sync-state'
      const REMOTE_OBJ = { key: 'remote' }
      const LOCAL_OBJ = { key: 'local' }
      const FIND_ARGS = { arg: 'something' }

      const fakeStream = new Readable({read: () => null, objectMode: true})
      fakeStream.push(REMOTE_OBJ)
      fakeStream.push(null)
      td.when(remote.Remote.findUpdated(SYNC_STATE, FIND_ARGS)).thenReturn(fakeStream)
      remote.Remote.getRevId = (remoteObj, findArgs) => {
        expect(remoteObj).to.eql(REMOTE_OBJ)
        expect(findArgs).to.eql(FIND_ARGS)
        return NEW_SYNC_STATE
      }
      // td.when(remote.Remote.getRevId(REMOTE_OBJ, FIND_ARGS)).thenReturn(NEW_SYNC_STATE)
      const syncState = {
        getSyncState: td.function(),
        saveSyncState: td.function('saveSyncState')
      }
      td.when(syncState.getSyncState('Local')).thenReturn(Promise.resolve(SYNC_STATE))
      const pipe = {
        remote: 'Remote',
        local: 'Local',
        findArgs: FIND_ARGS,
        onRecord: td.function('onRecord')
      }
      local.Local.upsert = () => { throw new Error('should not call here') }
      const a = new Aqueduct(remote, local, queue, syncState)
      a.addFaucet(pipe)
      a.on(SyncEvents.SYNC_COMPLETE, (evt) => {
        td.verify(pipe.onRecord(local, REMOTE_OBJ))
        td.verify(syncState.saveSyncState('Local', NEW_SYNC_STATE))
        expect(evt.local).to.equal('Local')
        done()
      })
      a.start()
    })

    it('sync remote objects and updates sync state', (done) => {
      const SYNC_STATE = 'sync-state'
      const NEW_SYNC_STATE = 'new-sync-state'
      const REMOTE_OBJ = { key: 'remote' }
      const LOCAL_OBJ = { key: 'local' }
      const FIND_ARGS = { arg: 'something' }

      const fakeStream = new Readable({read: () => null, objectMode: true})
      fakeStream.push(REMOTE_OBJ)
      fakeStream.push(null)
      td.when(remote.Remote.findUpdated(SYNC_STATE, FIND_ARGS)).thenReturn(fakeStream)
      remote.Remote.getRevId = (remoteObj, findArgs) => {
        expect(remoteObj).to.eql(REMOTE_OBJ)
        expect(findArgs).to.eql(FIND_ARGS)
        return NEW_SYNC_STATE
      }
      // td.when(remote.Remote.getRevId(REMOTE_OBJ, FIND_ARGS)).thenReturn(NEW_SYNC_STATE)
      const syncState = {
        getSyncState: td.function(),
        saveSyncState: td.function('saveSyncState')
      }
      td.when(syncState.getSyncState('Local')).thenReturn(Promise.resolve(SYNC_STATE))
      const pipe = {
        remote: 'Remote',
        local: 'Local',
        findArgs: FIND_ARGS,
        cleanse: td.function(),
        fields: ['key']
      }
      td.when(pipe.cleanse(REMOTE_OBJ, local)).thenReturn(Promise.resolve(LOCAL_OBJ))
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

    it('skip local insert if cleanse returns false', (done) => {
      const SYNC_STATE = 'sync-state'
      const NEW_SYNC_STATE = 'new-sync-state'
      const REMOTE_OBJ = { key: 'remote' }
      const FIND_ARGS = { arg: 'something' }

      const fakeStream = new Readable({read: () => null, objectMode: true})
      fakeStream.push(REMOTE_OBJ)
      fakeStream.push(null)
      td.when(remote.Remote.findUpdated(SYNC_STATE, FIND_ARGS)).thenReturn(fakeStream)
      remote.Remote.getRevId = (remoteObj, findArgs) => {
        expect(remoteObj).to.eql(REMOTE_OBJ)
        expect(findArgs).to.eql(FIND_ARGS)
        return NEW_SYNC_STATE
      }
      // td.when(remote.Remote.getRevId(REMOTE_OBJ, FIND_ARGS)).thenReturn(NEW_SYNC_STATE)
      const syncState = {
        getSyncState: td.function(),
        saveSyncState: td.function('saveSyncState')
      }
      td.when(syncState.getSyncState('Local')).thenReturn(Promise.resolve(SYNC_STATE))
      const pipe = {
        remote: 'Remote',
        local: 'Local',
        findArgs: FIND_ARGS,
        cleanse: x => false,
        fields: ['key']
      }
      local.Local.upsert = function(rec) {
        done(new Error('should not be called'))
      }
      const a = new Aqueduct(remote, local, queue, syncState)
      a.addPipe(pipe)
      a.on(SyncEvents.SYNC_COMPLETE, (evt) => {
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
      const msg = {payload: {type: 'Local', action: 'create', data: 'bla bla bla'}}
      td.when(syncState.getSyncState('Local')).thenReturn(new Promise(() => null))
      td.when(queue.get()).thenReturn(Promise.resolve(msg), Promise.resolve(undefined))
      td.when(pipe.prepare('bla bla bla',
        td.matchers.contains({action: 'create'}), local))
        .thenReturn({field: 'prepared data', other: 'something to discard'})
      local.Local.upsert = () => new Promise(() => null)
      remote.Remote.create = data => {
        // td.verify(pipe.prepare('bla bla bla', 'insert', local))
        expect(data).to.eql({field: 'prepared data'})
        done()
        return new Promise(() => null)
      }
      const a = new Aqueduct(remote, local, queue, syncState)
      a.addPipe(pipe)
      a.start()
    })

    it('calls prepare and resolve promise when creating records', (done) => {
      const pipe = {
        remote: 'Remote',
        local: 'Local',
        prepare: td.function(),
        fields: ['field']
      }
      const msg = {payload: {type: 'Local', action: 'create', data: 'bla bla bla'}}
      td.when(syncState.getSyncState('Local')).thenReturn(new Promise(() => null))
      td.when(queue.get()).thenReturn(Promise.resolve(msg), Promise.resolve(undefined))
      td.when(pipe.prepare('bla bla bla', td.matchers.contains({action: 'create'}), local))
        .thenResolve({field: 'prepared data', other: 'something to discard'})
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

    it('calls prepare and skip update if returned false', (done) => {
      const pipe = {
        remote: 'Remote',
        local: 'Local',
        prepare: td.function(),
        fields: ['field']
      }
      const msg = {payload: {type: 'Local', action: 'create', data: 'bla bla bla'}}
      td.when(syncState.getSyncState('Local')).thenReturn(new Promise(() => null))
      td.when(queue.get()).thenReturn(Promise.resolve(msg), Promise.resolve(undefined))
      td.when(pipe.prepare('bla bla bla', td.matchers.contains({action: 'create'}), local))
        .thenResolve(false)
      local.Local.upsert = () => new Promise(() => null)
      remote.Remote.create = data => {
        done(new Error('should not be called'))
      }
      const a = new Aqueduct(remote, local, queue, syncState)
      a.addPipe(pipe)
      a.start()
      setTimeout(done, 35)
    })

    it('upserts on local connection with result of create', (done) => {
      const pipe = {
        remote: 'Remote',
        local: 'Local',
        cleanse: td.function(),
        fields: ['field']
      }
      const msg = {payload: {type: 'Local', action: 'create', data: {field: 'bla bla bla', something_else: 'foo'}}}
      // a promise that doesn't resolve so we don't try to pull stuff down
      td.when(syncState.getSyncState('Local')).thenReturn(new Promise(() => null))
      td.when(queue.get()).thenReturn(Promise.resolve(msg), Promise.resolve(undefined))
      td.when(remote.Remote.create({field: 'bla bla bla'}, undefined, td.matchers.contains({
        // can't do an exact match, because the pipe will have been enhanced
        remote: pipe.remote, local: pipe.local, fields: pipe.fields
      })))
        .thenResolve({field: 'result from create'})
      td.when(pipe.cleanse({field: 'result from create'}, local))
        .thenReturn({field: 'cleansed result from create'})
      local.Local.update = (rec, id) => {
        // td.verify(pipe.cleanse(local, {field: 'result from create'}))
        expect(rec).to.eql({field: 'cleansed result from create'})
        done()
        return new Promise(() => ({}))
      }
      const a = new Aqueduct(remote, local, queue, syncState)
      a.addPipe(pipe)
      a.start()
    })

    it('builds joints and enhance the cleanse function', () => {
      local.OtherLocal = localCollection({
        getKeyField: () => 'Id',
        get: () => Promise.resolve({id: 'my parent', name: 'Something'})
      })
      const pipe = {
        remote: 'Remote',
        local: 'Local',
        cleanse: null,
        fields: ['field', 'lookup'],
        joints: [
          { lookupField: 'lookup', parentFieldName: 'parent', parentFields: ['id', 'name'], parentEntity: 'OtherLocal' }
        ]
      }
      // a promise that doesn't resolve so we don't try to pull stuff down
      td.when(syncState.getSyncState('Local')).thenReturn(new Promise(() => null))
      const a = new Aqueduct(remote, local, queue, syncState)
      a.addPipe(pipe)
      a.start()
      return a.pipes[0].cleanse({lookup: 'testing'}).then(x => {
        expect(x).to.eql({lookup: 'testing', parent: { id: 'my parent', name: 'Something' }})
      })
    })

    it('calls enhanced cleanse function when there is a joint', (done) => {
      local.OtherLocal = localCollection({
        getKeyField: () => 'Id',
        get: () => Promise.resolve({id: 'my parent', name: 'Something'})
      })
      const pipe = {
        remote: 'Remote',
        local: 'Local',
        cleanse: null,
        fields: ['field', 'lookup'],
        joints: [
          { lookupField: 'lookup', parentFieldName: 'parent', parentFields: ['id', 'name'], parentEntity: 'OtherLocal' }
        ]
      }
      const fakeStream = new Readable({read: () => null, objectMode: true})
      fakeStream.push({lookup: '123'})
      fakeStream.push(null)
      remote.Remote.findUpdated = () => Promise.resolve(fakeStream)
      syncState.getSyncState = () => Promise.resolve(123)
      syncState.saveSyncState = () => Promise.resolve()
      local.Local.upsert = record => {
        expect(record).to.eql({
          lookup: '123', parent: { id: 'my parent', name: 'Something' }
        })
        done()
        return Promise.resolve({})
      }
      const a = new Aqueduct(remote, local, queue, syncState)
      a.addPipe(pipe)
      a.start()
    })
  })

  describe('cleanse', () => {
    it('makes cleanse into a promise returning function', () => {
      const pipe = {
        remote: 'Remote',
        local: 'Local',
        cleanse: (x) => x,
        fields: ['key']
      }
      const a = new Aqueduct()
      a.addPipe(pipe)
      return a.pipes[0].cleanse({key: 'something'}).then(result => {
        expect(result).to.be.ok
      })
    })

    it('invokes the original cleanse function and uses result', () => {
      const pipe = {
        remote: 'Remote',
        local: 'Local',
        cleanse: () => {
          return {key: 'something new'}
        },
        fields: ['key']
      }
      const a = new Aqueduct()
      a.addPipe(pipe)
      return a.pipes[0].cleanse({key: 'something'}).then(result => {
        expect(result).to.eql({key: 'something new'})
      })
    })

    it('works with function returning a promise', () => {
      const pipe = {
        remote: 'Remote',
        local: 'Local',
        cleanse: () => {
          return new Promise((resolve) => {
            setImmediate(resolve({key: 'something new'}))
          })
        },
        fields: ['key']
      }
      const a = new Aqueduct()
      a.addPipe(pipe)
      return a.pipes[0].cleanse({key: 'something'}).then(result => {
        expect(result).to.eql({key: 'something new'})
      })
    })

    it('picks specified fields', () => {
      const pipe = {
        remote: 'Remote',
        local: 'Local',
        cleanse: null,
        fields: ['key']
      }
      const a = new Aqueduct()
      a.addPipe(pipe)
      return a.pipes[0].cleanse({key: 'something', other: 'stuff'}).then(result => {
        expect(result).to.eql({key: 'something'})
      })
    })

    it('uses field map to enhance cleanse method', () => {
      const pipe = {
        remote: 'Remote',
        local: 'Local',
        cleanse: null,
        fields: ['key'],
        map: {key: 'newkey'}
      }
      const a = new Aqueduct()
      a.addPipe(pipe)
      return a.pipes[0].cleanse({key: 'something'}).then(result => {
        expect(result).to.eql({newkey: 'something'})
      })
    })

    it('uses property paths in field map', () => {
      const pipe = {
        remote: 'Remote',
        local: 'Local',
        cleanse: null,
        map: {'old.key': 'new.key'}
      }
      const a = new Aqueduct()
      a.addPipe(pipe)
      return a.pipes[0].cleanse({old: { key: 'something' } }).then(result => {
        expect(result).to.eql({'new': { key: 'something' } })
      })
    })
  })
})
