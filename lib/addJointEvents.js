const SyncEvents = require('./syncEvents')
const R = require('ramda')

module.exports = function addJointEvents(aq, pipe, j) {
  if(j.enhanceCleanse)
    pipe.cleanse = j.enhanceCleanse(pipe.cleanse)
  const getRecord = R.prop('record')
  // we only need to concern ourselves with remote update.
  // if there is a local update, the joint will have already updated the local collection.
  // in the case where the local object is now getting an id, ideally we should go back and update
  // the children so that they have a reference to their parent's external id, but this is not
  // necessary since the prepare() function will take care of it (though it would be a potential
  // future optimization)
  if(j.onParentInserted)
    aq.on({source: 'remote', local: j.parentEntity}, SyncEvents.CREATED, R.pipe(getRecord, j.onParentUpdated))
  if(j.onParentUpdated)
    aq.on({source: 'remote', local: j.parentEntity}, SyncEvents.UPDATED, R.pipe(getRecord, j.onParentUpdated))
  if(j.onChildUpdated)
    aq.on({source: 'remote', local: j.childEntity}, SyncEvents.UPDATED, R.pipe(getRecord, j.onParentUpdated))
  if(j.onChildInserted)
    aq.on({source: 'remote', local: j.childEntity}, SyncEvents.CREATED, R.pipe(getRecord, j.onChildInserted))
  if(j.onChildRemoved)
    aq.on({source: 'remote', local: j.childEntity}, SyncEvents.DELETED, R.pipe(getRecord, j.onChildRemoved))
}
