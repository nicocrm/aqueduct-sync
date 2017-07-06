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
    })
  const handleUpdate = R.compose(
    logPromiseError(log),
    async msg => {
      const updated = await remote.update(pipe.prepare(msg.data))
      const cleaned = await pipe.cleanse(updated)
      syncEvents.onUpdated(cleaned)
      await upsertLocal(cleaned, msg.identifier)
    })
  tapEvents
    .on(pipe.local + ':create', msg => handleCreate(msg).then(() => ack(msg)))
    .on(pipe.local + ':update', msg => handleUpdate(msg).then(() => ack(msg)))
}
