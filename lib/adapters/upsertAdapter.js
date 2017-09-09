
module.exports = function upsertAdapter(pipe, remote, upsertWithEvents, saveSyncState) {
  return async record => {
    const cleaned = await pipe.cleanse(record)
    const upserted = await upsertWithEvents(cleaned)
    const syncState = remote.getRevId(record, pipe.findArgs)
    return saveSyncState(syncState)
  }
}
