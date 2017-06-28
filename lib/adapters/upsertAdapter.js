module.exports = function upsertAdapter(upsert, cleanse, saveSyncState) {
  return function(entity) {
    return upsert(cleanse(entity)).then(() => saveSyncState(entity))
  }
}
