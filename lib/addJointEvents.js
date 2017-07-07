const SyncEvents = require('./syncEvents')
const R = require('ramda')

module.exports = function addJointEvents(aq, pipe, j) {
  if(j.enhanceCleanse)
    pipe.cleanse = j.enhanceCleanse(pipe.cleanse)
  if(j.onParentInserted)
    aq.on({source: 'remote', local: j.parentEntity},
      SyncEvents.INSERTED,
      R.pipe(R.prop('record'), j.onParentUpdated))
  if(j.onParentUpdated)
    aq.on({source: 'remote', local: j.parentEntity},
      SyncEvents.UPDATED,
      R.pipe(R.prop('record'), j.onParentUpdated))
  if(j.onChildUpdated)
    aq.on({source: 'remote', local: j.parentEntity},
      SyncEvents.UPDATED,
      R.pipe(R.prop('record'), j.onParentUpdated))
  if(j.onChildInserted)
    aq.on({source: 'remote', local: j.childEntity},
      SyncEvents.INSERTED,
      R.pipe(R.prop('record'), j.onChildInserted))
  if(j.onChildRemoved)
    aq.on({source: 'remote', local: j.childEntity},
      SyncEvents.DELETED,
      R.pipe(R.prop('record'), j.onChildRemoved))
}
