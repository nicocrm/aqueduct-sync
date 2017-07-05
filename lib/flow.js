// schedule for the incoming sync
// based on the pipe configuration

module.exports = function flow(findUpdated, upsert, interval, logger) {
  // at interval:
  //  - call remote.findUpdated
  //  - call local.upsert with the resulting records
  //  we could send some event?
  // - run immediately
  const runSync = () => {
    logger.debug('Running sync...')
    return findUpdated().then(stream =>
      new Promise((resolve, reject) => {
        stream.on('data', rec => {
          logger.debug('Got 1 record', rec)
          upsert(rec)
          // do we want to stop the sync when there is an error? probably not
        })
        .on('error', err => {
          logger.error('Error reading records', err)
          resolve()
        })
      // note that we resolve here, even though the records could still be being written on the
      // local connection.
      // this is because we assume that the local connection is a lot faster than the remote
        .on('end', resolve)
      })
    ).then(() => {
      logger.debug('Sync complete')
      setTimeout(runSync, interval)
    }, err => {
      logger.error('Unhandled error running sync', err)
    })
  }
  return runSync()
}
