const enhanceMethods = require('../lib/utils/enhanceMethods')
const td = require('testdouble')

describe('enhanceMethods', () => {
  it('returns original object', () => {
    const original = { m() {} }
    const enhanced = enhanceMethods(original, { m(fn) { fn() } })
    expect(enhanced).to.equal(original)
  })

  it('calls original object method', () => {
    const m = td.function()
    const original = { m }
    const enhanced = enhanceMethods(original, {
      m(fn) {
        fn(123)
      }
    })
    enhanced.m()
    td.verify(m(123))
  })

  it('enhances multiple methods', () => {
    const m = td.function('m'), n = td.function('n')
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
    td.verify(m(123))
    td.verify(n(456))
  })

  it('passes arguments from caller', () => {
    const m = td.function()
    const original = { m }
    const enhanced = enhanceMethods(original, {
      m(fn, a, b) {
        expect(a).to.equal('a')
        fn(123, a, b)
      }
    })
    enhanced.m('a', 'b')
    td.verify(m(123, 'a', 'b'))
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
