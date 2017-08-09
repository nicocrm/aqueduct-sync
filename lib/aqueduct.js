// const path = require('path'),
//   fs = require('fs')
const R = require('ramda')
const FilteredEventEmitter = require('./utils/FilteredEventEmitter')
const buildJoint = require('aqueduct-pipe-joints/remote')
const flow = require('./flow')
const tap = require('./tap')
const tapEvents = require('./tapEvents')
const loggerFactory = require('./utils/logger')
const sequence = require('./utils/sequence')
const propertyMapper = require('./utils/propertyMapper.js')
const upsertEvents = require('./adapters/upsertEvents.js')
const logPromiseError = require('./adapters/logPromiseError.js')
const syncStateEntityAdapter = require('./adapters/syncStateEntityAdapter.js')
const SyncEvents = require('./syncEvents')
const addJointEvents = require('./addJointEvents')

/**
 * Main orchestrator for the sync.
 * Read in all the pipe modules, set up handler for the queue to dispatch to appropriate
 * pipe, and a scheduled sync for each pipe.
 */
class Aqueduct extends FilteredEventEmitter {
  constructor(remoteConnection, localConnection, queue, syncStateStorage) {
    super()
    this.remoteConnection = remoteConnection
    this.localConnection = localConnection
    this.queue = queue
    this.syncStateStorage = syncStateStorage
    this.pipes = []
    this.tapEventSource = null
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
    const pickFields = pipeConfig.fields ? R.pick(pipeConfig.fields) : R.identity
    this.pipes.push({
      ...pipeConfig,
      cleanse: R.compose(
        // use this to make sure we get a promise
        Promise.resolve.bind(Promise),
        pipeConfig.cleanse ? R.curryN(2, pipeConfig.cleanse.bind(pipeConfig))(R.__, this.localConnection) : R.identity,
        propertyMapper(pipeConfig.map),
        pickFields),
      prepare: (rec, action) =>
        Promise.resolve(pipeConfig.prepare ? pipeConfig.prepare(rec, action, this.localConnection) : rec)
          .then(propertyMapper(pipeConfig.map, true))
          .then(pickFields)
    })
  }

  /**
   * Set up handlers and start the scheduled sync
   */
  start() {
    // create queue, that will receive the pipe config
    if(this.tapEventSource) {
      throw new Error('Sync is already running')
    }
    this.tapEventSource = tapEvents(this.queue)

    for(let p of this.pipes) {
      this._startPipe(this.tapEventSource, p)
    }
  }

  _startPipe(tapEvents, pipe) {
    const remote = this.remoteConnection[pipe.remote]
    if(!remote)
      throw new Error(`Invalid remote collection ${pipe.remote}`)
    const local = this.localConnection[pipe.local]
    if(!local)
      throw new Error(`Invalid local collection ${pipe.local}`)
    if(pipe.joints)
      // start with the joints because they can modify the pipe
      this._buildJoints(pipe, local)
    this._buildFlow(pipe, remote, local)
    this._handleTap(tapEvents, pipe, remote, local)
  }

  _handleTap(tapEvents, pipe, remote, local) {
    const log = loggerFactory('tap', pipe.remote)
    const ack = this.queue.ack.bind(this.queue)
    const events = new SyncEvents(this, {local: pipe.local, source: 'local'})
    tap(tapEvents, pipe, local.update.bind(local), remote, ack, log, events)
  }

  _buildFlow(pipe, remote, local) {
    // create connection adapters
    const {getSyncState, saveSyncState} = syncStateEntityAdapter(this.syncStateStorage, pipe.local)
    const events = new SyncEvents(this, {local: pipe.local, source: 'remote'})
    const log = loggerFactory('flow', pipe.remote)
    const findUpdated = R.compose(logPromiseError(log),
      R.composeP(
        R.curryN(2, remote.findUpdated.bind(remote))(R.__, pipe.findArgs),
        getSyncState))
    // const upsert = R.compose(logPromiseError(log),
    //   resolveAndCall(
    const upsert = R.compose(logPromiseError(log),
      sequence(
        R.composeP(upsertEvents(local.upsert.bind(local), events), pipe.cleanse),
        R.compose(saveSyncState, remote.getRevId)
      ))

    // create schedule for pipe
    flow(findUpdated, upsert, pipe.interval || Aqueduct.defaults.SYNC_INTERVAL, log)
      .on(SyncEvents.SYNC_COMPLETE, () => events.emit(SyncEvents.SYNC_COMPLETE))
  }

  _buildJoints(pipe, local) {
    pipe.joints.forEach(R.pipe(
      config => ({
        ...config,
        // add the collections
        childCollection: local,
        parentCollection: this.localConnection[config.parentEntity],
        childEntity: pipe.local
      }),
      // build the joint, using aqueduct-pipe-joint
      buildJoint,
      // hook the joint up
      R.partial(addJointEvents, [this, pipe])
    ))
  }
}

Aqueduct.defaults = {
  SYNC_INTERVAL: 60000 // 1 minute
}
// to get the event names
Aqueduct.SyncEvents = SyncEvents

module.exports = Aqueduct
