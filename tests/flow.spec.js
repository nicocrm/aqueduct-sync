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
      info: td.function('info'),
      warn: td.function('warn')
    }
  })

  it('returns an event emitter that emits flow event when the flow runs', (done) => {
    let started = false
    const findUpdated = td.function()
    const upsert = td.function()
    const fakeStream = new Readable({
      read: () => null,
      objectMode: true
    })
    fakeStream.push(null)
    td.when(findUpdated()).thenReturn(Promise.resolve(fakeStream))
    flow({findUpdated, upsert, interval: 60000, logger})
      .on(SyncEvents.SYNC_START, () => { started = true })
      .on(SyncEvents.SYNC_COMPLETE, () => {
        expect(started).to.equal(true)
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
    flow({findUpdated, upsert, interval: 60000, logger}).on(SyncEvents.SYNC_COMPLETE, () => {
      td.verify(upsert('REMOTE'))
      done()
    })
  })

  it('does not upsert records after encountering an error', (done) => {
    const findUpdated = td.function()
    const upsert = td.function()
    const fakeStream = new Readable({
      read: () => null,
      destroy: (err, cb) => {
        cb()
      },
      objectMode: true
    })
    fakeStream.push('REMOTE')
    fakeStream.push('REMOTE2')
    td.when(findUpdated()).thenReturn(Promise.resolve(fakeStream))
    td.when(upsert('REMOTE')).thenReject()
    flow({findUpdated, upsert, interval: 60000, logger}).on(SyncEvents.SYNC_COMPLETE, () => {
      expect(td.explain(upsert).callCount).to.equal(1)
      expect(td.explain(logger.error).callCount).to.equal(1)
      // console.log(td.explain(logger.warn))
      // console.log(td.explain(upsert))
      done()
    })
    setTimeout(() => {
      fakeStream.push(null)
    }, 20)
  })

  it('reports errors from the stream', (done) => {
    // we need to be able to handle the case where the stream reports an error
    const findUpdated = td.function()
    const upsert = td.function()
    const fakeStream = new Readable({read: () => null, objectMode: true})
    td.when(findUpdated()).thenReturn(Promise.resolve(fakeStream))
    td.config({ignoreWarnings: true})
    flow({findUpdated, upsert, interval: 60000, logger}).on(SyncEvents.SYNC_COMPLETE, () => {
      td.verify(logger.error("Error reading records", td.matchers.contains({message: "AAAA"})))
      done()
    })
    // need a little timeout, because the flow will run the sync using setImmediate
    setTimeout(function() {
      fakeStream.emit('error', new Error('AAAA'))
      fakeStream.push(null)
    }, 10)
  })

  it('reports errors from upsert', (done) => {
    const findUpdated = td.function()
    const upsert = td.function()
    const fakeStream = new Readable({read: () => null, objectMode: true})
    fakeStream.push('REMOTE')
    fakeStream.push(null)
    td.when(findUpdated()).thenReturn(Promise.resolve(fakeStream))
    td.when(upsert('REMOTE')).thenReject(new Error('AAAA'))
    td.config({ignoreWarnings: true})
    flow({findUpdated, upsert, interval: 60000, logger}).on(SyncEvents.SYNC_COMPLETE, () => {
      td.verify(logger.error("Error upserting record", td.matchers.contains({message: "AAAA"})))
      done()
    })
  })

  it('runs a sync when SYNC_START event is received', (done) => {
    const upsert = () => null
    const findUpdated = () => {
      const fakeStream = new Readable({read: () => null, objectMode: true})
      setTimeout(() => {
        fakeStream.push(null)
      }, 50)
      return Promise.resolve(fakeStream)
    }
    td.config({ignoreWarnings: true})
    let numRun = 0
    const myFlow = flow({findUpdated, upsert, interval: 60000, logger}).on(SyncEvents.SYNC_COMPLETE, () => {
      numRun++
      if(numRun == 2) {
        done()
      } else {
        setTimeout(function() {
          myFlow.emit(SyncEvents.SYNC_START)
        })
      }
    })
  })

  it('does not run sync at start, when runNow is false', (done) => {
    const findUpdated = () => {
      throw new Error('Should not run sync!')
    }
    const upsert = () => null
    flow({findUpdated, upsert, interval: 60000, logger, runNow: false})
    setTimeout(done, 50)
  })

  it('does not run 2 syncs at the same time', (done) => {
    let counter = 0
    const findUpdated = () => {
      if(counter === 1)
        throw new Error('Should not run sync!')
      counter++
      return new Promise(() => null)
    }
    const upsert = () => null
    const myFlow = flow({findUpdated, upsert, interval: 60000, logger, runNow: true})
    setTimeout(() => {
      myFlow.emit(SyncEvents.SYNC_START)
    }, 50)
    setTimeout(done, 100)
  })

  it('runs sync at scheduled interval', (done) => {
    let counter = 0
    const findUpdated = () => {
      if(counter === 1)
        done()
      counter++
      const fakeStream = new Readable({read: () => null, objectMode: true})
      setTimeout(() => {
        fakeStream.push(null)
      })
      return Promise.resolve(fakeStream)
    }
    const upsert = () => null
    const myFlow = flow({findUpdated, upsert, interval: 50, logger, runNow: true})
  })

  it('runs sync at scheduled interval, when not running at start', (done) => {
    let counter = 0
    const findUpdated = () => {
      if(counter === 1)
        done()
      counter++
      const fakeStream = new Readable({read: () => null, objectMode: true})
      setTimeout(() => {
        fakeStream.push(null)
      })
      return Promise.resolve(fakeStream)
    }
    const upsert = () => null
    const myFlow = flow({findUpdated, upsert, interval: 50, logger, runNow: false})
  })

})
