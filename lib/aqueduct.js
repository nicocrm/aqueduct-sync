// const path = require('path'),
//   fs = require('fs')
const R = require('ramda')
const EventEmitter = require('events')
const flow = require('./flow')
const tap = require('./tap')
const tapEvents = require('./tapEvents')
const loggerFactory = require('./utils/logger')
const upsertAdapter = require('./adapters/upsertAdapter.js')
const findUpdatedAdapter = require('./adapters/findUpdatedAdapter.js')
const logPromiseError = require('./adapters/logPromiseError.js')
const syncStateEntityAdapter = require('./adapters/syncStateEntityAdapter.js')
const SyncEvents = require('./syncEvents')

/**
 * Main orchestrator for the sync.
 * Read in all the pipe modules, set up handler for the queue to dispatch to appropriate
 * pipe, and a scheduled sync for each pipe.
 */
class Aqueduct extends EventEmitter {
  constructor(remoteConnection, localConnection, queue, syncStateStorage) {
    super()
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
    this.pipes.push({
      ...pipeConfig,
      cleanse: R.compose(pipeConfig.cleanse ? pipeConfig.cleanse.bind(pipeConfig, this.localConnection) : R.identity,
        R.pick(pipeConfig.fields)),
      prepare: (pipeConfig.prepare ? pipeConfig.prepare.bind(pipeConfig) : R.identity)
    })
  }

  /**
   * Set up handlers and start the scheduled sync
   */
  start() {
    // create queue, that will receive the pipe config
    const tapEventSource = tapEvents(this.queue)

    for(let p of this.pipes) {
      this._startPipe(tapEventSource, p)
    // create relation object (that will listen to events for updating the collections)
    }

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

  _startPipe(tapEvents, pipe) {
    const remote = this.remoteConnection[pipe.remote]
    if(!remote)
      throw new Error(`Invalid remote collection ${pipe.remote}`)
    const local = this.localConnection[pipe.local]
    if(!local)
      throw new Error(`Invalid local collection ${pipe.local}`)
    this._buildFlow(pipe, remote, local)
    this._handleTap(tapEvents, pipe, remote, local)
  }

  _handleTap(tapEvents, pipe, remote, local) {
    const log = loggerFactory('tap-' + pipe.remote)
    const ack = this.queue.ack.bind(this.queue)
    tap(tapEvents, pipe, local.upsert.bind(local), remote.create.bind(remote), ack, log)
  }

  _buildFlow(pipe, remote, local) {
    // create connection adapters
    const {getSyncState, saveSyncState} = syncStateEntityAdapter(this.syncStateStorage, pipe.local)
    const log = loggerFactory('flow-' + pipe.remote)
    const findUpdated = R.compose(logPromiseError(log),
      findUpdatedAdapter(remote.findUpdated.bind(remote), getSyncState))
    const upsert = R.compose(logPromiseError(log),
      upsertAdapter(local.upsert.bind(local), pipe.cleanse, R.compose(saveSyncState, remote.getRevId)))
    // create schedule for pipe
    flow(findUpdated, upsert, pipe.interval || Aqueduct.defaults.SYNC_INTERVAL, log)
      .on(SyncEvents.SYNC_COMPLETE, () => this.emit(SyncEvents.SYNC_COMPLETE, {local: pipe.local}))
  }
}

Aqueduct.defaults = {
  SYNC_INTERVAL: 60000 // 1 minute
}

module.exports = Aqueduct
