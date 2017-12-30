const R = require('ramda')
const objectPath = require('object-path')

/**
 * Create a property mapper function.
 * Given a map of the form {a: 'b', ...}, return a function that will take an object parameter
 * and modify it in place, removing "a" key and putting its value in the "b" key.
 */
module.exports = function propertyMapper(map, reverse = false) {
  if(!map)
    return R.identity
  const kv = R.toPairs(map)
  if(reverse)
    kv.forEach(a => a.reverse())
  return function(source) {
    if(!source)
      return source
    kv.forEach(([oldKey, newKey]) => {
      if(oldKey in source) {
        objectPath.set(source, newKey, objectPath.get(source, oldKey))
        objectPath.del(source, oldKey)
      }
    })
    return source
  }
}
