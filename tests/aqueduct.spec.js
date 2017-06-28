const Aqueduct = require('../lib/aqueduct')
const td = require('testdouble')
const {Readable} = require('stream')

describe('aqueduct', () => {
  describe('start', () => {
    let syncState, remote, local

    beforeEach(() => {
      syncState = {
        getSyncState: td.function('getSyncState'),
        saveSyncState: td.function('saveSyncState')
      }
      remote = { Remote: {
        findUpdated: td.function('findUpdated'),
        getRevId: td.function('getRevId')
      } }
      local = { Local: {
        upsert: td.function('upsert')
      } }
    })

    it('does nothing, if there is no pipe', () => {
      const q = {
        get: () => undefined
      }
      const a = new Aqueduct(remote, local, q, syncState)
      a.start()
    })

    it('builds flow for the pipes', () => {
      const flow = td.replace('../lib/flow'),
        Aqueduct = require('../lib/aqueduct')

      const q = { get: () => undefined }
      const pipe = { local: 'Local', remote: 'Remote', cleanse: td.function() }
      const a = new Aqueduct(remote, local, q, syncState)
      a.addPipe(pipe)
      a.start()
      td.verify(flow(td.matchers.isA(Function), td.matchers.isA(Function), td.matchers.isA(Number)))
    })

    it('sync remote objects and updates sync state', (done) => {
      const SYNC_STATE = 'sync-state'
      const NEW_SYNC_STATE = 'new-sync-state'
      const REMOTE_OBJ = { key: 'remote' }
      const LOCAL_OBJ = { key: 'local' }

      const q = {
        get: () => undefined
      }
      const fakeStream = new Readable({read: () => null, objectMode: true})
      fakeStream.push(REMOTE_OBJ)
      td.when(remote.Remote.findUpdated(SYNC_STATE)).thenReturn(fakeStream)
      td.when(remote.Remote.getRevId(REMOTE_OBJ)).thenReturn(NEW_SYNC_STATE)
      const syncState = {
        getSyncState: td.function(),
        saveSyncState: td.function('saveSyncState')
      }
      td.when(syncState.getSyncState('Local')).thenReturn(SYNC_STATE)
      const pipe = {
        remote: 'Remote',
        local: 'Local',
        cleanse: td.function()
      }
      td.when(pipe.cleanse(REMOTE_OBJ)).thenReturn(LOCAL_OBJ)
      td.when(local.Local.upsert(LOCAL_OBJ)).thenReturn(Promise.resolve())
      const a = new Aqueduct(remote, local, q, syncState)
      a.addPipe(pipe)
      a.start()
      setTimeout(() => {
        td.verify(syncState.saveSyncState('Local', NEW_SYNC_STATE))
        done()
      }, 500)
    })

    it.skip('starts tap and checks for queue message at interval', (done) => {
      const q = {
        get: sinon.stub().yields()
      }
      const a = new Aqueduct({}, {}, q, {})
      a.start(10)
      setTimeout(() => {
        expect(q.get).to.have.been.called
        done()
      }, 1000)
    })
  })
})
