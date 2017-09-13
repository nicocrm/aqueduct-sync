# Aqueduct Sync

An opinionated sync library.

Orchestrate the synchronization of records between 2 systems, local and remote, assuming:

 * the remote system has a way to check for new records based on a given state
 * the local system has a reliable queue that will send operations (create, update, remove)
 * in case of concurrent modification, the remote system wins all conflicts

This library is built for a special purpose and may not fit any other.  It was broken off from
an existing project to ensure decoupling.

## Aqueduct

An aqueduct is built with a local and remote connection, as well as a queue (that will convey
operations to be synced from the local to the remote).

```
const aqueduct = new Aqueduct(localConnection, remoteConnection, queue, syncStateStorage)
aqueduct.addPipe(...)
aqueduct.start()
```

Methods:

 * `start`: start the scheduled syncs (both in and out)
 * `addPipe`: add a pipe to the configuration.  The pipe will only be started once `start` is called.
 * `addFaucet`: add a faucet to the configuration.  It will only be started once `start` is called.
 * `runFlow(localName)`: request a sync of the specified (inbound) flow.  Returns false if the flow could not be found, true otherwise.  Note that even if the flow is found, the sync may not run if it is already in process.  This can only be called after `start` has been called.


## Pipes

Once that is done, individual collections can be synced by adding pipes, which is a configuration
of:

 * the local collection name
 * the remote collection name
 * the fields to be sent between the 2 systems (other fields will be removed from the output) - this can be ommitted, to send and keep all the fields
 of the prepare function before sending the object on, and from the input of the cleanse function)
 * the cleanse (from remote to local) and prepare (from local to remote) functions to be run when data is exchanged.  This can be straight mapping, or calculations (but for simple mapping, better use the map property instead).  If the cleanse method does not return an object, then the record is not inserted (but the sync state is still updated).  This allows for custom skipping logic.
 * relations between collections, which are to be maintained when records are imported from the
 remote collection

These pipes can be added individually or loaded from a folder of Javascript files.
All the pipes must be added before calling the `start` method.

```
const pipe = {
    // name of local collection (also the identifier for the sync state)
    local: 'Projects',
    // name of remote collection
    remote: 'Opportunity',
    // optional arguments that will be passed to the remote `findUpdated` method
    findArgs: null,
    // these are the remote fields we are interested in, leave unspecified to keep all fields
    // any other field will be discarded
    // remember to include the fields that are necessary to get the revision id
    // if there is a map, these fields need to refer to the REMOTE name, not the local (mapped) name
    fields: ['Name', 'EstimatedClose', 'Amount', 'EstimatedAmount', 'Probability'],
    // in cleanse, we can reference only fields that are listed in fields, but we can add
    // new fields as needed (in other word cleansing happens AFTER picking/mapping)
    // the localConnection parameter is the connection that was configured on the main aqueduct instance
    // this can return a cleaned record or a promise to one (or false, to cancel)
    // the function will be invoked with the scope set to the pipe configuration object
    cleanse: function(rec, localConnection) {
      return {
        ...rec,
        Amount: rec.EstimatedAmount * rec.Probability,
        _calendarStartDate: min([rec.ProjectStartDate, rec.EstimatedStartDate])
      }
    },
    // in prepare, we can reference all fields from the local source, but fields that are not
    // listed in fields will be removed
    // the record will have the "unmapped" (local) names: prepare happens BEFORE picking/mapping
    // it can return a cleaned record or a promise to one
    // the function will be invoked with the scope set to the pipe configuration object
    // action will be "insert" or "update"
    // when this is called for an update, the data will contain only the values that are being
    // modified as part of that update
    // The result will be merged with the existing record, retrieved from the remote, before being
    // finally sent to the remote update method
    // To cancel an update, throw an Error (the update will be reattempted)
    //   TODO: a way to cancel an update permanently.
    prepare: function(rec, action, localConnection) {
      return {
        ...rec,
        EstimatedAmount: rec.Amount
      }
    },
    // optional mapping of remote -> local field
    // this mapping will be performed BEFORE the cleanse function and AFTER the prepare function
    // it is not currently able to read "paths", only simple properties
    map: {
      RemoteField: 'Local Name'
    },
    // configuration of relationships (M-1) to be maintained on the local collection
    // (this is handled by aqueduct-pipe-joints but not directly in aqueduct-sync)
    joints: [{
      // the field, on the local entity, where to store the parent record reference
      // this will be stored as an object
      parentFieldName: '',
      // what fields to store for the parent record (optional, if not provided we just keep the key)
      parentFields: [''],
      // the field, on the local entity, that refers to a parent (this may be a period-separated path)
      lookupField: '',
      // what entity (local name) this refers to
      parentEntity: '',
      // field on the Parent entity where we would like to store a collection of children
      relatedListName: '',
      // what fields to store for each child (the key is added automatically)
      relatedListFields: ['']
    }],
    // optional interval in ms (defaults to 5 minutes)
    interval: 60000,
    // this defaults to true, but can be set to false to skip initially running the pipe
    runAtStartup: true
}
aqueduct.addPipe(pipe)
```

## Faucet

A faucet is a simpler version of a pipe, it is used to check for records but without importing them into the system (and it is unidirectional - there is no local to remote side of the sync).  For example this can be used to run a sync that deletes some records based on a given condition, or detect some changes that will trigger an on-demand sync.

```
const faucet = {
  // optional interval in ms (defaults to 5 minutes)
  interval: 60000,
  // this defaults to true, but can be set to false to skip initially running the pipe
  runAtStartup: true
  // identifier for the sync state, and used in log messages
  // this does not need to be a valid local connection
  local: 'MyFaucet',
  // name of remote collection to be checked
  remote: 'Remote Name',
  // optional arguments for findUpdated
  findArgs: {
  },
  onRecord: function(localConnection, record) {
    // take action with the received record.
    // if this function returns a string, it will be interpreted as the name
    // of a pipe to run the flow (inbound sync) for
    // a given pipe will be triggered only once per invocation of the faucet
  }
}
aqueduct.addFaucet(faucet)
```

## Connections

There are 2 connections with different capabilities: the local and the remote.
Each connection maintains a list of collections - individual services that implement the specific
operation for each entity we are interested in.

Thus:

```
const connection = getMeAConnection()
const service = connection.Customer
service.find(...)
```

### Local Connection

The collections on this connection must implement:

 * `upsert(record)`: create or update a record, based on the record key (or composite key)
    - this can be a partial update: only the fields that are specified should be updated
    - return a promise to an object with properties "inserted" and "updated" set to number of records affected respectively (these are used to trigger the events about the sync status)
 * `update(record, identifierOrQuery)`: update a record using a local identifier
    - local identifier can be either the id passed with a local update message, or a selection query (an object of field: value), or it can be blank (in which case the selector should be extracted from the record)
    - this can update multiple records
    - this can be a partial update
    - return a promise that resolves when the update completes (the resolved value is not used)

Additionally if joints are used the following operations will be needed:

 * get(recordSelector): retrieve a single record
 * find(recordSelector): retrieve an array of records (this is expected to be used with a limited number of records)
 * addOrUpdateChildInCollection
 * removeChildFromCollection

### Remote Connection

The collections on this connection must implement:

 * create(record, metadata) - create a single record.  Return the updated record, which will include the generated key and the rev id.  May throw an error if the record already exists.
 * update(record, metadata) - update a single record, based on the key (specific to the collection / connection).  Throw an error if the record does not exist.  Returns updated record.
    - this does not have to do any conflict resolution here, because we'll handle it from the pipe
    - this can be a partial update, so if it is necessary for the remote API to have the full record they will need to retrieve it (e.g. as part of the `prepare` step)
 * remove(record, metadata) - remove a record, based on the key
 * getRevId(record) - retrieve the rev id for the record, used to identify updated records
 * findUpdated(revId) - retrieve records (as a stream of objects) that have been updated since the given rev id
 * compareRevId(record1, record2) - compare the rev id between the 2 records and return a value:
    - smaller than 0, if record1 is smaller (older) than record2
    - 0, if the 2 records have the same rev
    - greater than 0, if record2 is higher (more recent) than record 2

## Sync State Storage

This parameter is an object which must implement:

 * getSyncState(entity): retrieve a promise resolving to the sync state for that entity (local name)
 * saveSyncState(entity, syncState): save the sync state for the entity (local name).  Return a promise.  We update the sync state when records are synced from the remote, not when they are written from the local to the remote, to avoid race conditions.

The sync state is an opaque object, that will be passed to the remote connection to determine
records that need syncing.

## Queue

The queue object is an object which must implement this API:

 * get(): return a promise that resolves to the next message in the queue, or undefined if no message is available
     - this should automatically return messages to the queue if they are not acknowledged in a timely fashion, to ensure reliability
 * ack(msg): acknowledge a message, removing it from the queue.  Return a promise that resolves to the message id (for logging)

The messages must be objects with a `payload` property of the following format:

 * `action`: create, update, delete (delete is NOT implemented at this time)
 * `type`: the local entity name
 * `data`: the record data.  For an update this should be partial data, including only the fields that were changed.
 * `identifier`: a local record identifier that will be passed to the upsert call
 * `meta`: optional metadata that will be passed unmodified to the create, update or remove method

Note this API is a promisified version of a subset of methods from [mongodb-queue](https://github.com/chilts/mongodb-queue)

## Events

The aqueduct instance will emit the following events:

 * `Aqueduct.SyncEvents.SYNC_COMPLETED`: a scheduled sync has completed (for the specified entity)
 * `Aqueduct.SyncEvents.SYNC_START`: a scheduled sync has started (for the specified entity)
 * `Aqueduct.SyncEvents.UPDATED`
 * `Aqueduct.SyncEvents.CREATED`
 * `Aqueduct.SyncEvents.DELETED`
 * `Aqueduct.SyncEvents.UPSERT_RESULT`: a record was upserted - will be provided the result from the upsert function as a `result` property

Events will have the following parameters:

 * `local`: name of local entity
 * `source`: "remote" or "local"
 * `record`: record being synced (local version) - for the events that represent a single record

These events can be automatically filtered, by passing a filter as first parameter when registering the event:

```
aq.on({source: 'remote'}, Aqueduct.SyncEvents.SYNC_COMPLETED, function() { ... })
```

## Logging

Use `DEBUG=aqueduct:*` to enable debugging output.

By default the module will log error and information to the console, but it is possible to customize by using the `setLogger` method to pass a custom logger object:

```
aqueduct.setLogger(myLogger)
```

The custom logger must have `info` and `error` methods.  By default the debugging output will still be filtered by the DEBUG environment variable and sent to the console (using the `debug` npm module), but if desired the debug logger can be set with:

```
aqueduct.setLogger(myLogger, true)
```

In which case, `myLogger` must have a `debug` method.

Setting the logger only has an effect when it is done before pipes have been added.

## TODO

 * Being able to specify the interval as a CRON-type schedule string instead
