const enhanceMethods = require('./utils/enhanceMethods')

// an adapter for automatically providing the entity name with sync state
module.exports = function(syncStateStorage, entity) {
  return enhanceMethods(syncStateStorage, {
    getSyncState(original) {
      original(entity)
    },
    setSyncState(original, syncState) {
      original(entity, syncState)
    }
  })
}
