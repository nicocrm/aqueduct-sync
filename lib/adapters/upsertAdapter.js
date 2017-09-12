
module.exports = function upsertAdapter(pipe, remote, upsertFun, saveSyncState) {
  return async record => {
    const cleaned = pipe.cleanse ? await pipe.cleanse(record) : record
    let result = false
    if(cleaned) {
      result = await upsertFun(cleaned)
    }
    const syncState = remote.getRevId(record, pipe.findArgs)
    await saveSyncState(syncState)
    return result
  }
}
