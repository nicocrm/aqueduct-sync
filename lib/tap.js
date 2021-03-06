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
      if(!prepared) {
        log.debug('prepare returned false - skipping record')
        await ack(msg)
        return
      }
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
      if(!prepared) {
        log.debug('prepare returned false - skipping record')
        await ack(msg)
        return
      }
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
  // make the pipe re-process the record as if it had been newly read
  const handleReread = R.compose(
    logPromiseError(log),
    async msg => {
      // this may take a while, but we don't need to wait for the result,
      // or handle errors, the flow runner will manage that
      syncEvents.onReread(msg.payload.data)
      await ack(msg)
    })
  tapEvents
    .on(pipe.local + ':create', handleCreate)
    .on(pipe.local + ':update', handleUpdate)
    .on(pipe.local + ':reread', handleReread)
}
