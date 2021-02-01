const Mutation = require('../mutation')

function TOROperator() {}

TOROperator.prototype.ID = 'TOR'
TOROperator.prototype.name = 'transaction-origin-replacement'

TOROperator.prototype.getMutations = function(file, source, visit) {
  const mutations = []

  visit({
    MemberAccess: (node) => {
      if((node.memberName == 'origin')){
       mutations.push(new Mutation(file, node.range[0], node.range[1]+1, 'msg.sender'))
      }else if (node.memberName == 'sender'){
        mutations.push(new Mutation(file, node.range[0], node.range[1]+1, 'tx.origin'))
      }
    },
  })

  return mutations
}
module.exports = TOROperator
