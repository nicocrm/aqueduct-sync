describe('relation', () => {
  it('updates the parent collection when a child is updated', () => {
    //     parentCollection.update({Id: 'theparent'}, {$set: {_children: [{Id: 'thechild', Name: 'Old Name', OtherField: 'something'}]}})
    // const child = {Id: 'thechild', Name: 'Child 1', Parent__c: 'theparent'}
    // lookup.onChildSynced(child)
    // const parent = parentCollection.findOne({Id: 'theparent'})
    // parent._children.should.eql([{Id: 'thechild', Name: 'Child 1', OtherField: 'something'}])
  })

  it('updates the parent collection when a child is updated, multiple children', () => {
    // parentCollection.update({Id: 'theparent'}, {
    //   $set: {
    //     _children: [{Id: 'thechild', Name: 'Old Name'},
    //       {Id: 'otherchild', Name: 'othername'}]
    //   }
    // })
    // const child = {Id: 'thechild', Name: 'Child 1', Parent__c: 'theparent'}
    // lookup.onChildSynced(child)
    // const parent = parentCollection.findOne({Id: 'theparent'})
    // parent._children.should.eql([{Id: 'thechild', Name: 'Child 1'}, {Id: 'otherchild', Name: 'othername'}])
  })

  it('updates the parent collection when a child is inserted', () => {
    //     const child = {Id: 'thechild', Name: 'Child 1', Parent__c: 'theparent'}
    // lookup.onChildSynced(child)
    // const parent = parentCollection.findOne({Id: 'theparent'})
    // parent.should.have.property('_children')
    // parent._children.should.eql([{Id: 'thechild', Name: 'Child 1'}])
  })

  it('adds a new child to parent collection', () => {
    // parentCollection.update({Id: 'theparent'}, {$set: {_children: [{Id: 'thechild'}]}})
    // const child = {Id: 'thechild2', Name: 'Child 2', Parent__c: 'theparent'}
    // lookup.onChildSynced(child)
    // const parent = parentCollection.findOne({Id: 'theparent'})
    // parent._children.should.eql([{Id: 'thechild'}, {Id: 'thechild2', Name: 'Child 2'}])
  })

  it('does not error when inserting a child without a valid parent', () => {
  })

  it('updates the parent lookup when the parent is inserted after the child', () => {
  })

  it('clears parent lookup when the lookup field is cleared', () => {
    // const child = lookup.onChildSynced({Id: 'thechild', Name: 'Child 1', Parent__c: null})
    // expect(child.Parent__r).to.equal(null)
  })

  it('updates the parent collection when the parent is inserted after the child', () => {
    // childCollection.insert({Id: 'child1', Parent__c: 'theparent', Parent__r: null})
    // childCollection.insert({Id: 'child2', Parent__c: 'theparent'})
    // childCollection.insert({Id: 'child3', Parent__c: 'otherparent'})
    // lookup._onParentInserted({Id: 'theparent', Name: 'Foo'})
    // const parent = parentCollection.findOne({Id: 'theparent'})
    // expect(parent).to.be.ok
    // parent.should.have.property('_children')
    // parent._children.should.eql([{Id: 'child1'}, {Id: 'child2'}])
  })

  it('updates the parent lookup when a child is inserted or updated', () => {
    // const child = lookup.onChildSynced({Id: 'thechild', Name: 'Child 1', Parent__c: 'theparent'})
    // expect(child.Parent__r).to.eql({Id: 'theparent'})
  })

  it('updates the parent collection when the child is modified outside of sync', () => {
    // childCollection.insert({Id: 'thechild', Name: 'Director', Parent__c: 'theparent'})
    // parentCollection.update({Id: 'theparent'}, {$set: {_children: [{Id: 'thechild', Name: 'Director'}]}})
    // childCollection.update({Id: 'thechild'}, {$set: {Name: 'Manager'}})
    // const parent = parentCollection.findOne({Id: 'theparent'})
    // console.log(parent._children);
    // parent._children.should.have.length(1)
    // parent._children[0].should.eql({Id: 'thechild', Name: 'Manager'})
  })
})
