const enhanceMethods = require('./utils/enhanceMethods')

// an adapter for the remote connection that will automatically retrieves and pass the rev id when
// calling findUpdated
module.exports = function findUpdatedAdapter(remoteConnection, syncStateStorage) {
  return enhanceMethods(remoteConnection, {
    findUpdated(original) {
      const revId = syncStateStorage.getSyncState()
      return original(revId)
    }
  })
}
