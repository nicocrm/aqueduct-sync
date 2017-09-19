module.exports = function upsertEvents(upserter, events) {
  return function(record) {
    return upserter(record).then(upsertResult => {
      if(upsertResult) {
        if(upsertResult.inserted === 1)
          events.onCreated(upsertResult.record)
        else if(upsertResult.updated === 1)
          events.onUpdated(upsertResult.record)
      }
      events.onUpsertResult(record, upsertResult)
      return record
    })
  }
}
