// used to decorate an object's methods by providing a function to be executed around them
// the function will be passed the method as well as the original arguments
module.exports = function enhanceMethods(object, spec) {
  for(let k in spec) {
    const fn = object[k]
    object[k] = function() {
      spec[k].call(object, fn.bind(object), ...arguments)
    }
  }
  return object
}
