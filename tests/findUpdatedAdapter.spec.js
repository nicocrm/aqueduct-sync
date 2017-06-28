const findUpdatedAdapter = require('../lib/findUpdatedAdapter')

describe('findUpdatedAdapter', () => {
  it('wraps the remote connection', () => {
    const remote = { findUpdated: sinon.stub(), create: sinon.stub() }
    const syncState = {}
    const adapter = findUpdatedAdapter(remote, syncState)
    expect(adapter).to.have.property('findUpdated')
    expect(adapter).to.have.property('create')
  })

  it('calls findUpdated passing sync state', () => {
    const findUpdated = sinon.spy()
    const remote = { findUpdated }
    const syncState = { getSyncState: sinon.stub().returns('XXX') }
    const adapter = findUpdatedAdapter(remote, syncState)
    adapter.findUpdated()
    expect(syncState.getSyncState).to.have.been.called
    expect(findUpdated).to.have.been.calledWith('XXX')
  })
})
