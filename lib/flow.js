// schedule for the incoming sync
// based on the pipe configuration

module.exports = function flow(findUpdated, upsert, interval) {
  // at interval:
  //  - call remote.findUpdated
  //  - call local.upsert with the resulting records
  //  we could send some event?
  // - run immediately
  const runSync = () => {
    return new Promise((resolve, reject) => {
      findUpdated()
        .on('data', rec => {
          upsert(rec)
          // TODO: error handling
          // do we want to stop the sync when there is an error? probably not
        })
        .on('error', err => {
          // TODO better error handling
          console.warn('Error reading records', err)
          resolve()
        })
      // note that we resolve here, even though the records could still be being written on the
      // local connection.
      // this is because we assume that the local connection is a lot faster than the remote
        .on('end', resolve)
    }).then(() => {
      setTimeout(runSync, interval)
    })
  }
  return runSync()
}
