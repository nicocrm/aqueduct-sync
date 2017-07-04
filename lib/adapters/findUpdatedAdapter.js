module.exports = function findUpdatedAdapter(findUpdated, getSyncState) {
  return () => getSyncState().then(revId => findUpdated(revId))
}
