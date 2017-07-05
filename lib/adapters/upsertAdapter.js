module.exports = function upsertAdapter(upsert, cleanse, saveSyncState) {
  return entity =>
    Promise.resolve(cleanse(entity)).then(cleaned =>
      upsert(cleaned).then(() =>
        // pass the original entity here
        saveSyncState(entity))
    )
}
