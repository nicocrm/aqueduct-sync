const path = require('path'),
  fs = require('fs')

/**
 * Main orchestrator for the sync.
 * Read in all the pipe modules, set up handler for the queue to dispatch to appropriate
 * pipe, and a scheduled sync for each pipe.
 */
class Flow {
  constructor(remoteConnection, localConnection, queue) {
    this.remoteConnection = remoteConnection
    this.localConnection = localConnection
    this.queue = queue
  }

  readPipes(folderName = './pipes') {
    fs.readdirSync(folderName).forEach(file => {
      const pipe = require(path.join(folderName, file))
      this.addPipe(pipe)
    })
  }

  /**
   * Add a single pipe module
   */
  addPipe(pipe) {
  }

  /**
   * Set up handlers and start the scheduled sync
   */
  start(syncInterval = 60000) {

  }

  /**
   * Pause sync
   */
  stop() {
  }
}

module.exports = Flow
