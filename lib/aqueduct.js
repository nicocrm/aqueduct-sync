// const path = require('path'),
//   fs = require('fs')
const R = require('ramda')
const FilteredEventEmitter = require('./utils/FilteredEventEmitter')
const buildJoint = require('aqueduct-pipe-joints/remote')
const flow = require('./flow')
const faucet = require('./faucet')
const tap = require('./tap')
const tapEvents = require('./tapEvents')
const loggerFactory = require('./utils/logger')
const sequence = require('./utils/sequence')
const propertyMapper = require('./utils/propertyMapper.js')
const upsertAdapter = require('./adapters/upsertAdapter.js')
const logPromiseError = require('./adapters/logPromiseError.js')
const syncStateEntityAdapter = require('./adapters/syncStateEntityAdapter.js')
const SyncEvents = require('./syncEvents')
const addJointEvents = require('./addJointEvents')
const assert = require('assert')

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
    this.faucets = []
    this.flows = {}
    this.tapEventSource = null
  }

  // readPipes(folderName = './pipes') {
  //   fs.readdirSync(folderName).forEach(file => {
  //     const pipe = require(path.join(folderName, file))
  //     this.addPipe(pipe)
  //   })
  // }

  /**
   * Pass a custom logger
   */
  setLogger(logger, useForDebug) {
    loggerFactory.setLogger(logger, useForDebug)
  }

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
      .then(p => (assert(p, 'no result from prepare'), p))
      .then(propertyMapper(pipeConfig.map, true))
      .then(pickFields)
    })
  }

  /**
   * Add a single faucet
   */
  addFaucet(faucetConfig) {
    this.faucets.push(faucetConfig)
  }

  /**
   * Set up handlers and start the scheduled sync
   */
  start() {
    // set a pretty high limit, because the joints will use up a bunch of them
    const numJoints = this.pipes.reduce((total, p) => total + (p.joints ? p.joints.length : 0), 0)
    this.setMaxListeners(2 * numJoints + 10)
    // create queue, that will receive the pipe config
    if(this.tapEventSource) {
      throw new Error('Sync is already running')
    }
    this.tapEventSource = tapEvents(this.queue)

    for(let p of this.pipes) {
      this._startPipe(this.tapEventSource, p)
    }
    for(let f of this.faucets) {
      this._startFaucet(f)
    }
  }

  runFlow(localName) {
    if(localName in this.flows) {
      this.flows[localName].emit(SyncEvents.SYNC_START)
      return true
    }
    return false
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

    this.flows[pipe.local] = this._buildFlow(pipe, remote, local.upsert.bind(local))
    this._handleTap(tapEvents, pipe, remote, local)
  }

  _startFaucet(f) {
    const remote = this.remoteConnection[f.remote]
    if(!remote)
      throw new Error(`Invalid remote collection ${f.remote}`)
    const flow = this._buildFlow(f, remote, f.onRecord.bind(f, this.localConnection))
    faucet({
      flow,
      runFlow: this.runFlow.bind(this)
    })
  }

  _handleTap(tapEvents, pipe, remote, local) {
    const log = loggerFactory('tap', `${pipe.local}->${pipe.remote}`)
    const ack = this.queue.ack.bind(this.queue)
    const events = new SyncEvents(this, {local: pipe.local, source: 'local'})
    tap(tapEvents, pipe, local.update.bind(local), remote, ack, log, events)
  }

  _buildFlow(pipe, remote, upsertFun) {
    // create connection adapters
    const {getSyncState, saveSyncState} = syncStateEntityAdapter(this.syncStateStorage, pipe.local)
    const logger = loggerFactory('flow', `${pipe.remote}->${pipe.local}`)
    const upsert = upsertAdapter(pipe, remote, upsertFun, saveSyncState)
    const findUpdated = () => {
      // findUpdated is not async, but getSyncState is, this wraps it
      // it will return a rejected promise if getSyncState errors
      return getSyncState().then(state => remote.findUpdated(state, pipe.findArgs))
    }

    // create schedule for pipe
    const interval = pipe.interval || Aqueduct.defaults.SYNC_INTERVAL
    const runNow = pipe.runAtStartup !== false
    return flow({local: pipe.local, findUpdated, upsert, interval, logger, runNow})
    // forward events from the flow
      .on(SyncEvents.SYNC_START, this.emit.bind(this, SyncEvents.SYNC_START))
      .on(SyncEvents.SYNC_COMPLETE, this.emit.bind(this, SyncEvents.SYNC_COMPLETE))
      .on(SyncEvents.CREATED, this.emit.bind(this, SyncEvents.CREATED))
      .on(SyncEvents.UPDATED, this.emit.bind(this, SyncEvents.UPDATED))
      .on(SyncEvents.DELETED, this.emit.bind(this, SyncEvents.DELETED))
      .on(SyncEvents.UPSERT_RESULT, this.emit.bind(this, SyncEvents.UPSERT_RESULT))
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
  SYNC_INTERVAL: 60 * 5 * 1000 // 5 minute
}
// to get the event names
Aqueduct.SyncEvents = SyncEvents

module.exports = Aqueduct
