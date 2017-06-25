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
aqueduct.flow()
```

## Pipes

Once that is done, individual collections can be synced by adding pipes, which is a configuration
of:

 * the local collection name
 * the remote collection name
 * the fields to be sent between the 2 systems (other fields will be removed from the output
 of the prepare function before sending the object on, and from the input of the cleanse 
 function)
 * the cleanse (from remote to local) and prepare (from local to remote) functions to be run
 when data is exchanged.  This can be straight mapping, or calculations.
 * relations between collections, which are to be maintained when records are imported from the 
 remote collection

These pipes can be added individually or loaded from a folder of Javascript files.

```
const pipe = {
    // name of local collection (also the identifier for the sync state)
    local: 'Projects',
    // name of remote collection
    remote: 'Opportunity',
    // identifier (can also be an array of fields for a composite key)
    keyFields: 'ProjectNumber',
    // these are the remote fields we are interested in.
    // any other field
    fields: ['Name', 'EstimatedClose', 'Amount', 'EstimatedAmount', 'Probability'],
    // in cleanse, we can reference only fields that are listed in fields, but we can add
    // new fields as needed
    cleanse: rec => ({
        ...rec, 
        Amount: rec.EstimatedAmount * rec.Probability,
        _calendarStartDate: min([rec.ProjectStartDate, rec.EstimatedStartDate])
    }),
    // in prepare, we can reference all fields from the local source, but fields that are not
    // listed in fields will be removed
    prepare: rec => ({
        ...rec,
        EstimatedAmount: rec.Amount
    }),
    // configuration of relationships to be maintained on the local collection (TODO)
    relations: [{

    }]
}
aqueduct.addPipe(pipe)
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

The collections on this connection implement:

 * upsert(record, keyFields): create or update a record, based on the record key (or composite key)
 * relation operation (add / remove / update children?)  - TBD

### Remote Connection

The collection on this connection implement:

 * create(record) - create a single record.  Return the updated record, which will include the 
 generated key.  May throw an error if the record already exists.
 * update(record) - update a single record, based on the key (specific to the collection / connection).  Throw an error if the record does not exist.  This does a "hard" update (irrespective
 of sync state), the caller is expected to have managed sync conflicts already.
 * findUpdated(state) - retrieve records (as a stream of objects) that have been updated since 
 the given state
 * getIfUpdated(recordKey, syncState) - retrieve a single record, but only if it has been updated
 since the given state (null otherwise)

## Sync State Storage

This parameter is an object with methods for:

 * getSyncState(entity): retrieve the sync state for that entity (local name)
 * saveSyncState(entity, syncState)

The sync state is an opaque object, that will be passed to the remote connection to determine
records that need syncing.
