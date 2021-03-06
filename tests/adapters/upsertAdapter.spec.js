const td = require('testdouble'),
  upsertAdapter = require('../../lib/adapters/upsertAdapter.js')

describe('upsertAdapter', () => {
  let originalUpsert, adaptedUpsert, cleanse, saveSyncState, getRevId

  beforeEach(() => {
    originalUpsert = td.function('upsert')
    cleanse = td.function('cleanse')
    saveSyncState = td.function('saveSyncState')
    getRevId = td.function('getRevId')
    const pipe = {
      cleanse,
      findArgs: 'findargs'
    }
    const remote = {
      getRevId
    }
    adaptedUpsert = upsertAdapter(pipe, remote, originalUpsert, saveSyncState)
  })

  it('returns a promise', () => {
    const record = {}
    td.when(cleanse(record)).thenReturn('result from cleanse')
    td.when(originalUpsert('result from cleanse')).thenReturn(new Promise(function() {}))
    const result = adaptedUpsert(record)
    expect(result).to.have.property('then')
  })

  it('calls saveSyncState with original record when promise resolves function', () => {
    const record = {}
    td.when(cleanse(record)).thenReturn('result from cleanse')
    td.when(originalUpsert('result from cleanse')).thenReturn(Promise.resolve('result from upsert'))
    td.when(getRevId(record, 'findargs')).thenReturn('syncState')
    const result = adaptedUpsert(record)
    return result.then(() => {
      td.verify(saveSyncState('syncState'))
    })
  })

  it('passes result from cleanse function when it returns a promise', () => {
    const record = {}
    td.when(cleanse(record)).thenReturn(Promise.resolve('result from cleanse'))
    td.when(originalUpsert('result from cleanse')).thenReturn(Promise.resolve('result from upsert'))
    td.when(getRevId(record, 'findargs')).thenReturn('syncState')
    const result = adaptedUpsert(record)
    return result.then(() => {
      td.verify(saveSyncState('syncState'))
    })
  })
})
