const R = require('ramda')
const logPromiseError = require('./adapters/logPromiseError.js')

// tap handler
module.exports = function tap(tapEvents, pipe, updateLocal, remote, ack, log, syncEvents) {
  const handleCreate = R.compose(
    logPromiseError(log),
    async msg => {
      // For performance, should we fetch the record now, rather than carrying its data in the payload?
      const created = await remote.create(pipe.prepare(msg.payload.data))
      const cleaned = await pipe.cleanse(created)
      syncEvents.onCreated(cleaned)
      await updateLocal(cleaned, msg.payload.identifier)
      await ack(msg)
      log.debug('record created', msg.payload.identifier)
    })
  const handleUpdate = R.compose(
    logPromiseError(log),
    async msg => {
      const updated = await remote.update(pipe.prepare(msg.payload.data))
      const cleaned = await pipe.cleanse(updated)
      syncEvents.onUpdated(cleaned)
      await updateLocal(cleaned, msg.payload.identifier)
      await ack(msg)
      log.debug('record updated', msg.payload.identifier)
    })
  tapEvents
    .on(pipe.local + ':create', handleCreate)
    .on(pipe.local + ':update', handleUpdate)
}
