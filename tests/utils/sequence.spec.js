const td = require('testdouble')
const sequence = require('../../lib/utils/sequence.js')

describe('sequence', () => {
  it('calls multiple promise functions with original parameters', () => {
    const f = td.function(), g = td.function()
    const s = sequence(f, g)
    td.when(f('foo')).thenResolve('x')
    td.when(g('foo')).thenResolve('y')
    return s('foo').then(final => {
      final.should.equal('y')
    })
  })

  it('does not call if function rejects', () => {
    const f = td.function(), g = td.function()
    const s = sequence(f, g)
    td.when(f('foo')).thenReject('x')
    td.when(g('foo')).thenResolve('y')
    return s('foo').catch(final => {
      final.should.equal('x')
      td.explain(g).callCount.should.equal(0)
    })
  })
})
