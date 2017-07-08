const propertyMapper = require('../../lib/utils/propertyMapper')

describe('propertyMapper', () => {
  it('returns a function', () => {
    expect(propertyMapper({a: 'b'})).to.be.a('function')
  })

  it('maps keys in the object parameter', () => {
    const m = propertyMapper({a: 'b'})
    expect(m({a: 'c'})).to.eql({b: 'c'})
  })

  it('does not lose original keys', () => {
    const m = propertyMapper({a: 'b'})
    expect(m({d: 'c'})).to.eql({d: 'c'})
  })

  it('works in reverse', () => {
    const m = propertyMapper({a: 'b'}, true)
    expect(m({b: 'c'})).to.eql({a: 'c'})
  })
})
