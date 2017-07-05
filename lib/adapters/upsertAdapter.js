module.exports = function upsertAdapter(upsert, cleanse, saveSyncState) {
  return function(entity) {
    return Promise.resolve(cleanse(entity))
      .then(upsert)
    // pass the original entity here
      .then(() => saveSyncState(entity))
  }
}
