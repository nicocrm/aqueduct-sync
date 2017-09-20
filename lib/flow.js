// schedule for the incoming sync
// based on the pipe configuration
const EventEmitter = require('events')
const SyncEvents = require('./syncEvents.js')
const upsertEvents = require('./adapters/upsertEvents.js')

function readRecords(stream, upsert, logger) {
  return new Promise((resolve, reject) => {
    let promise = Promise.resolve(), failed = false
    try {
      stream
        .on('error', err => {
          logger.error('Error reading records', err)
          resolve()
        })
        .on('data', rec => {
          // logger.debug('Got 1 record', rec)
          // we serialize the upsert and stop the sync if there is an error, to prevent a case where an upsert
          // fails and a later one succeeds, which would break the sync state.
          // this makes us lose the parallelism here, unfortunately.  The other major downside is that if there is
          // one bad record, it will hold up the sync for the other ones.
          // we should probably revisit at some point to have it perform the upsert in parallel and only save the sync
          // state if they ALL succeed
          promise = promise.then(() => {
            if(!failed) {
              return upsert(rec).catch(err => {
                logger.error('Error upserting record', err)
                stream.destroy()
                // we cannot bubble the error, because the handler will be attached only later, so node
                // will think we let the promise go through unhandled
                // so instead we use this flag to halt the sync
                failed = true
              })
            }
          })
          // do we want to stop the sync when there is an error? probably not
          // but if we catch error like this, it means we'll up the sync state to a value higher than that of the record
          // that errored out (that's only in the case of an upsert erroring out, though, which should be fairly rare?)
        })
      // using Promise.all causes massive memory usage when trying to listen to a very large number of promises
      // .on('end', () => Promise.all(promises).then(resolve, reject))
        .on('end', () => {
          promise.catch(err => {
            // SHOULD NOT HAPPEN - because we are handling the errors
            logger.error('handling error from rejected promise - SHOULD NOT HAPPEN', err)
          }).then(resolve)  // resolve once all the upserts have completed
        })
    } catch(e) {
      logger.debug('Exception in record reader', e)
      reject(e)
    }
  })
}

module.exports = function flow({local, findUpdated, upsert, interval, logger, runNow=true}) {
  // at interval:
  //  - call remote.findUpdated
  //  - call local.upsert with the resulting records
  //  we could send some event?
  // - run immediately
  let scheduled = false, running = false
  const events = new SyncEvents(new EventEmitter(), {local, source: 'remote'})
  const upsertWithEvents = upsertEvents(upsert, events)

  const runSync = () => {
    if(running) {
      logger.debug('Sync is already running, skipping')
      return
    }
    running = true
    logger.debug('Running sync...')
    return findUpdated().then(
      stream => readRecords(stream, upsertWithEvents, logger),
      err => {
        logger.error('Error getting updated records (probably getting the sync state from the local database)', err)
      }
    ).then(() => {
      // little delay to give upsert a chance to complete (this is really only useful for unit tests)
      running = false
      setImmediate(() => events.onSyncComplete())
      logger.debug('Sync complete')
    }, err => {
      logger.error('Unhandled error running sync', err)
    })
  }
  const scheduleSync = () => {
    if(!scheduled) {
      scheduled = true
      setTimeout(() => {
        scheduled = false
        runSync()
      }, interval)
    }
  }

  events.on(SyncEvents.SYNC_COMPLETE, scheduleSync)
  events.on(SyncEvents.SYNC_START, runSync)
  if(runNow)
    // delay just a tad, so we have a chance to hook on the SYNC_START event
    setImmediate(() => events.onSyncStart())
  else
    scheduleSync()
  return events
}
