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
      info: td.function('info')
    }
  })

  it('returns an event emitter that emits flow event when the flow runs', (done) => {
    const findUpdated = td.function()
    const upsert = td.function()
    const fakeStream = new Readable({read: () => null, objectMode: true})
    fakeStream.push(null)
    td.when(findUpdated()).thenReturn(Promise.resolve(fakeStream))
    flow(findUpdated, upsert, 60000, logger).on(SyncEvents.SYNC_COMPLETE, () => {
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
    flow(findUpdated, upsert, 60000, logger).on(SyncEvents.SYNC_COMPLETE, () => {
      td.verify(upsert('REMOTE'))
      done()
    })
  })

  it('reports errors from the stream', (done) => {
    // we need to be able to handle the case where the stream reports an error
    const findUpdated = td.function()
    const upsert = td.function()
    const fakeStream = new Readable({read: () => null, objectMode: true})
    td.when(findUpdated()).thenReturn(Promise.resolve(fakeStream))
    td.config({ignoreWarnings: true})
    flow(findUpdated, upsert, 60000, logger).on(SyncEvents.SYNC_COMPLETE, () => {
      td.verify(logger.error("Error reading records", td.matchers.contains({message: "AAAA"})))
      done()
    })
    setTimeout(function() {
      fakeStream.emit('error', new Error('AAAA'))
      fakeStream.push(null)
    })
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
    flow(findUpdated, upsert, 60000, logger).on(SyncEvents.SYNC_COMPLETE, () => {
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
    const myFlow = flow(findUpdated, upsert, 60000, logger).on(SyncEvents.SYNC_COMPLETE, () => {
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
    flow(findUpdated, upsert, 60000, logger, false)
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
    const myFlow = flow(findUpdated, upsert, 60000, logger, true)
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
    const myFlow = flow(findUpdated, upsert, 50, logger, true)
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
    const myFlow = flow(findUpdated, upsert, 50, logger, false)
  })

})
