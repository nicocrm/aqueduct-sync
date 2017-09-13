// schedule for the incoming sync
// based on the pipe configuration
const EventEmitter = require('events')
const SyncEvents = require('./syncEvents.js')
const upsertEvents = require('./adapters/upsertEvents.js')

function readRecords(stream, upsert, logger) {
  return new Promise((resolve, reject) => {
    let promises = []
    try {
      stream
        .on('error', err => {
          logger.error('Error reading records', err)
          resolve()
        })
        .on('data', rec => {
          // logger.debug('Got 1 record', rec)
          // do we want to serialize the inserts?  This is probably not much benefit, especially if we are
          // catching errors anyway
          // promises.push(upsert(rec).catch(err => {
          //   logger.error('Error upserting record', err)
          // }))
          upsert(rec).catch(err => {
            logger.error('Error upserting record', err)
          })
          // do we want to stop the sync when there is an error? probably not
          // but if we catch error like this, it means we'll up the sync state to a value higher than that of the record
          // that errored out (that's only in the case of an upsert erroring out, though, which should be fairly rare?)
        })
        // .on('end', () => Promise.all(promises).then(resolve, reject))
        .on('end', resolve) // note this may resolve before all the upserts are done
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
      setImmediate(() => events.emit(SyncEvents.SYNC_COMPLETE))
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
    setImmediate(() => events.emit(SyncEvents.SYNC_START))
  else
    scheduleSync()
  return events
}
