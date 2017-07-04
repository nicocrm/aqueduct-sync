// const path = require('path'),
//   fs = require('fs')
const R = require('ramda')
const flow = require('./flow')
const loggerFactory = require('./utils/logger')
const upsertAdapter = require('./adapters/upsertAdapter.js')
const findUpdatedAdapter = require('./adapters/findUpdatedAdapter.js')
const logPromiseError = require('./adapters/logPromiseError.js')
const syncStateEntityAdapter = require('./adapters/syncStateEntityAdapter.js')
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
  start() {
    for(let p of this.pipes) {
      this._buildFlow(p)
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
  }

  _buildFlow(pipe) {
    // create connection adapters
    let remote = this.remoteConnection[pipe.remote]
    if(!remote)
      throw new Error(`Invalid remote collection ${pipe.remote}`)
    let local = this.localConnection[pipe.local]
    if(!local)
      throw new Error(`Invalid local collection ${pipe.local}`)
    const {getSyncState, saveSyncState} = syncStateEntityAdapter(this.syncStateStorage, pipe.local)
    const cleanse = R.compose(pipe.cleanse || R.identity, R.pick(pipe.fields))
    const log = loggerFactory('flow-' + pipe.remote)
    const findUpdated = R.compose(logPromiseError(log),
      findUpdatedAdapter(remote.findUpdated.bind(remote), getSyncState))
    const upsert = R.compose(logPromiseError(log),
      upsertAdapter(local.upsert.bind(local), cleanse, R.compose(saveSyncState, remote.getRevId)))
    // create schedule for pipe
    flow(findUpdated, upsert, pipe.interval || Aqueduct.defaults.SYNC_INTERVAL, log)
  }
}

Aqueduct.defaults = {
  SYNC_INTERVAL: 60000 // 1 minute
}

module.exports = Aqueduct
