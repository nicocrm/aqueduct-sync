const R = require('ramda')
const logPromiseError = require('./adapters/logPromiseError.js')

function getData({payload: {data}}) {
  if(typeof data === 'string' && data[0] === '{')
    return JSON.parse(data)
  return data
}

function prepare(pipe, msg) {
  return pipe.prepare(
    getData(msg), {
      action: msg.payload.action,
      identifier: msg.payload.identifier
    }
  )
}

// tap handler
module.exports = function tap(tapEvents, pipe, updateLocal, remote, ack, log, syncEvents) {
  const handleCreate = R.compose(
    logPromiseError(log),
    async msg => {
      // For performance, should we fetch the record now, rather than carrying its data in the payload?
      const prepared = await prepare(pipe, msg)
      const created = await remote.create(prepared, msg.payload.meta, pipe)
      const cleaned = await pipe.cleanse(created)
      syncEvents.onCreated({
        ...msg.payload.data,
        ...cleaned
      }, msg.payload.identifier)
      await updateLocal(cleaned, msg.payload.identifier)
      await ack(msg)
      log.debug('record created', msg.payload.identifier)
    })
  const handleUpdate = R.compose(
    logPromiseError(log),
    async msg => {
      const prepared = await prepare(pipe, msg)
      const updated = await remote.update(prepared, msg.payload.meta, pipe)
      const cleaned = await pipe.cleanse(updated)
      syncEvents.onUpdated({
        ...msg.payload.data,
        ...cleaned
      }, msg.payload.identifier)
      if(!R.isEmpty(cleaned))
        await updateLocal(cleaned, msg.payload.identifier)
      await ack(msg)
      log.debug('record updated', msg.payload.identifier)
    })
  tapEvents
    .on(pipe.local + ':create', handleCreate)
    .on(pipe.local + ':update', handleUpdate)
}
