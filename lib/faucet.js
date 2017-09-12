const SyncEvents = require('./syncEvents.js')

module.exports = function faucet({flow, runFlow}) {
  const history = new Set()
  flow.on(SyncEvents.SYNC_START, () => {
    history.clear()
  })
  flow.on(SyncEvents.UPSERT_RESULT, ({result}) => {
    if(result && typeof(result) === 'string' && !history.has(result)) {
      history.add(result)
      runFlow(result)
    }
  })
}
