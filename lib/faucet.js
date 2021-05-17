const SyncEvents = require('./syncEvents.js')

module.exports = function faucet({flow, runFlow, onReread, logger}) {
  const history = new Set()
  flow.on(SyncEvents.SYNC_START, () => {
    history.clear()
  })
  flow.on(SyncEvents.UPSERT_RESULT, ({record, result}) => {
    if(result && typeof result === 'string' && !history.has(result)) {
      // for the case where we want to trigger a pipe as result
      history.add(result)
      runFlow(result)
    }
    if(result && typeof result === 'number') {
      onReread(record, result).catch(err => {
        logger.error('Error requeuing record to reread', err)
      })
    }
    // TODO some case where result is a number and we have a way to requeue the record in X minutes?
    // (send a "RECORD" event to the flow)
  })
}
