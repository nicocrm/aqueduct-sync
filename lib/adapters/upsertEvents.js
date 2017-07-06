module.exports = function upsertEvents(upserter, events) {
  return function(record) {
    return upserter(record).then(upsertResult => {
      if(upsertResult.inserted === 1)
        events.onCreated(record)
      else if(upsertResult.updated === 1)
        events.onUpdated(record)
      return record
    })
  }
}
