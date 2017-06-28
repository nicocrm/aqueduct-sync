// responsible for running the update check on the configured pipes
class SyncSchedule {
  constructor(pipes) {
    this.pipes = pipes
    this.scheduleHandle = null
    this.inProgress = false
  }

  start(syncInterval) {
    this.syncInterval = syncInterval
    this.scheduleHandle = setTimeout(this.run.bind(this))
    return this
  }

  stop() {
    if(this.scheduleHandle) {
      clearTimeout(this.scheduleHandle)
      this.scheduleHandle = null
    }
  }

  run() {
    if(this.inProgress)
      return
    this.inProgress = true
    const syncs = this.pipes.map(pipe => this._checkForUpdates(pipe))
    return Promise.all(syncs).then(() => {
      this.inProgress = false
      if(this.scheduleHandle !== null)
        this.scheduleHandle = setTimeout(this.run.bind(this), this.syncInterval)
    })
  }

  // check for updates on the pipe
  // return promise
  _checkForUpdates(pipe) {
    return pipe.checkForUpdates()
  }
}

module.exports = SyncSchedule
