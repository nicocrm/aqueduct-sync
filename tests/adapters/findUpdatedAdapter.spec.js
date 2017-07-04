const td = require('testdouble')
const findUpdatedAdapter = require('../../lib/adapters/findUpdatedAdapter')

describe('findUpdatedAdapter', () => {
  it('calls findUpdated passing sync state', () => {
    const findUpdated = td.function('findUpdated')
    const getSyncState = td.function()
    td.when(getSyncState()).thenReturn(Promise.resolve('XXX'))
    td.when(findUpdated('XXX')).thenReturn('RESULT')
    const adapter = findUpdatedAdapter(findUpdated, getSyncState)
    return adapter().then(result => {
      expect(result).to.equal('RESULT')
    })
  })
})
