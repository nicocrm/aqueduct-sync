const FilteredEventEmitter = require('../../lib/utils/FilteredEventEmitter.js')

describe('FilteredEventEmitter', () => {
  it('does not filter event if there was no filter', (done) => {
    const emitter = new FilteredEventEmitter()
    emitter.on('testname', () => {
      done()
    })
    emitter.emit('testname', {field: 'some stuff'})
  })

  it('only invokes events when they match the filter', (done) => {
    const emitter = new FilteredEventEmitter()
    emitter.on({something: 'not there'}, 'testname', () => {
      done('should not invoke event, that has a filter')
    })
    emitter.on({field: 'match'}, 'testname', () => {
      done()
    })
    emitter.emit('testname', {field: 'some stuff'})
    setImmediate(() => {
      emitter.emit('testname', { field: 'match' })
    })
  })
})
