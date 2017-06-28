const Aqueduct = require('../lib/aqueduct')

describe('aqueduct', () => {
  describe('start', () => {
    it('start sync schedule and checks for updates at interval', () => {
      const q = {
        get: sinon.stub().yields()
      }
      const a = new Aqueduct({}, {}, q, {})
      a.start(10)
      expect(a.syncSchedule).to.be.ok
    })

    it.skip('starts tap and checks for queue message at interval', (done) => {
      const q = {
        get: sinon.stub().yields()
      }
      const a = new Aqueduct({}, {}, q, {})
      a.start(10)
      setTimeout(() => {
        expect(q.get).to.have.been.called
        done()
      }, 1000)
    })
  })
})
