module.exports = function upsertEvents(upserter, events) {
  return function(record) {
    return upserter(record).then(upsertResult => {
      if(upsertResult) {
        if(upsertResult.inserted === 1)
          events.onCreated(record, upsertResult.recordId)
        else if(upsertResult.updated === 1)
          events.onUpdated(record, upsertResult.recordId)
      }
      events.onUpsertResult(record, upsertResult)
      return record
    })
  }
}
