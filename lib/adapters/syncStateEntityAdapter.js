const R = require('ramda')

// an adapter for automatically providing the entity name with sync state
module.exports = function(syncStateStorage, entity) {
  return {
    getSyncState: R.partial(syncStateStorage.getSyncState.bind(syncStateStorage), [entity]),
    saveSyncState: R.partial(syncStateStorage.saveSyncState.bind(syncStateStorage), [entity])
  }
}
