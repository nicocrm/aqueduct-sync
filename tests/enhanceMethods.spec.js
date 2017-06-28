const enhanceMethods = require('../lib/utils/enhanceMethods')

describe('enhanceMethods', () => {
  it('returns original object', () => {
    const original = { m() {} }
    const enhanced = enhanceMethods(original, { m(fn) { fn() } })
    expect(enhanced).to.equal(original)
  })

  it('calls original object method', () => {
    const m = sinon.spy()
    const original = { m }
    const enhanced = enhanceMethods(original, {
      m(fn) {
        fn(123)
      }
    })
    enhanced.m()
    expect(m).to.have.been.calledWith(123)
  })

  it('enhances multiple methods', () => {
    const m = sinon.spy(), n = sinon.spy()
    const original = { m, n }
    const enhanced = enhanceMethods(original, {
      m(fn) {
        fn(123)
      },
      n(fn) {
        fn(456)
      }
    })
    enhanced.m()
    enhanced.n()
    expect(m).to.have.been.calledWith(123)
    expect(n).to.have.been.calledWith(456)
  })

  it('passes arguments from caller', () => {
    const m = sinon.spy()
    const original = { m }
    const enhanced = enhanceMethods(original, {
      m(fn, a, b) {
        expect(a).to.equal('a')
        fn(123, a, b)
      }
    })
    enhanced.m('a', 'b')
    expect(m).to.have.been.calledWith(123, 'a', 'b')
  })

  it('calls methods in object scope', () => {
    const original = {
      m(x) {
        this.x = x
      }
    }
    const enhanced = enhanceMethods(original, {
      m(fn) { fn(123) }
    })
    enhanced.m()
    expect(original.x).to.equal(123)
  })
})
