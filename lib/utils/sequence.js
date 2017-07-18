// build a function that will run all the (promise-returning) functions in sequence, with the same (original)
// arguments (rather than something like R.pipeP, that will run each function with the result of the previous
// promise in the sequence)
module.exports = function sequence(...funcs) {
  return async function() {
    let r
    for(let fn of funcs) {
      r = await fn(...arguments)
    }
    return r
  }
}
