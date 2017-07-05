const R = require('ramda')
const logPromiseError = require('./adapters/logPromiseError.js')
const upsertAdapter = require('./adapters/upsertAdapter.js')

// tap handler
module.exports = function tap(tapEvents, pipe, upsertLocal, create, ack, log) {
  const upsert = upsertAdapter(upsertLocal, pipe.cleanse, R.identity)
  const prepare = R.compose(pipe.prepare, R.prop('data'))
  const handleCreate = R.compose(
    logPromiseError(log),
    R.composeP(upsert, create),
    prepare)
  tapEvents
    .on(pipe.local + ':create', msg => handleCreate(msg).then(() => ack(msg)))
}
