// const path = require('path'),
//   fs = require('fs')
const Pipe = require('./pipe'),
  SyncSchedule = require('./syncSchedule')
  // SyncEvents = require('./syncEvents')

/**
 * Main orchestrator for the sync.
 * Read in all the pipe modules, set up handler for the queue to dispatch to appropriate
 * pipe, and a scheduled sync for each pipe.
 */
class Aqueduct {
  constructor(remoteConnection, localConnection, queue, syncStateStorage) {
    this.remoteConnection = remoteConnection
    this.localConnection = localConnection
    this.queue = queue
    this.syncStateStorage = syncStateStorage
    this.pipes = []
  }

  // readPipes(folderName = './pipes') {
  //   fs.readdirSync(folderName).forEach(file => {
  //     const pipe = require(path.join(folderName, file))
  //     this.addPipe(pipe)
  //   })
  // }

  /**
   * Add a single pipe module
   */
  addPipe(pipeConfig) {
    this.pipes.push(pipeConfig)
  }

  /**
   * Set up handlers and start the scheduled sync
   */
  start(syncInterval = 60000) {
    for(let pipe of this.pipes) {
      // create connection adapters

      // create schedule for pipe

      // create relation object (that will listen to events for updating the collections)
    }
    // create queue, that will receive the pipe config

    // const syncEvents = {}
    // create the pipes, using remote / local connection
    // start the queue polling process, and save a reference so we can stop it
    // start the scheduled sync, and save a reference so we can stop it
    // we could have an adapter over the remote / local connection to handle dispatching the events and updating the
    // sync state
    if(this.syncSchedule) {
      throw new Error('Sync is already running')
    }
    //const pipes = this.pipes.map(pc => new Pipe(pc, this.remoteConnection, this.localConnection))
    this.syncSchedule = new SyncSchedule(pipes).start(syncInterval)
  }
}

module.exports = Aqueduct
