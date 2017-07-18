const R = require('ramda')
const logPromiseError = require('./adapters/logPromiseError.js')

// tap handler
module.exports = function tap(tapEvents, pipe, updateLocal, remote, ack, log, syncEvents) {
  const handleCreate = R.compose(
    logPromiseError(log),
    async msg => {
      // For performance, should we fetch the record now, rather than carrying its data in the payload?
      const prepared = await pipe.prepare(msg.payload.data, 'insert')
      const created = await remote.create(prepared)
      const cleaned = await pipe.cleanse(created)
      syncEvents.onCreated(cleaned)
      await updateLocal(cleaned, msg.payload.identifier)
      await ack(msg)
      log.debug('record created', msg.payload.identifier)
    })
  const handleUpdate = R.compose(
    logPromiseError(log),
    async msg => {
      const existing = await remote.get(msg.payload.data)
      const prepared = await pipe.prepare(msg.payload.data, 'update')
      const updated = await remote.update({...existing, ...prepared})
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
