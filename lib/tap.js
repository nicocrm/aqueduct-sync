const R = require('ramda')
const logPromiseError = require('./adapters/logPromiseError.js')

// tap handler
module.exports = function tap(tapEvents, pipe, upsertLocal, remote, ack, log, syncEvents) {
  const handleCreate = R.compose(
    logPromiseError(log),
    async msg => {
      const created = await remote.create(pipe.prepare(msg.data))
      const cleaned = await pipe.cleanse(created)
      syncEvents.onCreated(cleaned)
      await upsertLocal(cleaned, msg.identifier)
      await ack(msg)
    })
  const handleUpdate = R.compose(
    logPromiseError(log),
    async msg => {
      const updated = await remote.update(pipe.prepare(msg.data))
      const cleaned = await pipe.cleanse(updated)
      syncEvents.onUpdated(cleaned)
      await upsertLocal(cleaned, msg.identifier)
      await ack(msg)
    })
  tapEvents
    .on(pipe.local + ':create', handleCreate)
    .on(pipe.local + ':update', handleUpdate)
}
