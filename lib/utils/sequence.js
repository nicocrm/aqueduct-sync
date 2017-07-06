module.exports = function sequence(...funcs) {
  return async function() {
    let r
    for(let fn of funcs) {
      r = await fn(...arguments)
    }
    return r
  }
}
