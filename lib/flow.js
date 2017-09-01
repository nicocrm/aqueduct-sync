// schedule for the incoming sync
// based on the pipe configuration
const EventEmitter = require('events')
const SyncEvents = require('./syncEvents.js')

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
          promises.push(upsert(rec).catch(err => logger.error(err)))
          // do we want to stop the sync when there is an error? probably not
          // but if we catch error like this, it means we'll up the sync state to a value higher than that of the record
          // that errored out
        })
        .on('end', () => Promise.all(promises).then(resolve, reject))
    } catch(e) {
      logger.debug('Exception in record reader', e)
      reject(e)
    }
  })
}

module.exports = function flow(findUpdated, upsert, interval, logger) {
  // at interval:
  //  - call remote.findUpdated
  //  - call local.upsert with the resulting records
  //  we could send some event?
  // - run immediately
  const events = new EventEmitter()
  const runSync = () => {
    logger.debug('Running sync...')
    return findUpdated().then(
      stream => readRecords(stream, upsert, logger),
      err => {
        logger.error('Error getting updated records (probably getting the sync state from the local database)', err)
      }
    ).then(() => {
      // little delay to give upsert a chance to complete (this is really only useful for unit tests)
      setImmediate(() => events.emit(SyncEvents.SYNC_COMPLETE))
      logger.debug('Sync complete')
      setTimeout(runSync, interval)
    }, err => {
      logger.error('Unhandled error running sync', err)
    })
  }
  runSync()
  return events
}
