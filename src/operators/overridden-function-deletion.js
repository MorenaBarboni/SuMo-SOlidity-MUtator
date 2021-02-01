const Mutation = require('../mutation')

function ORFDOperator() {}

ORFDOperator.prototype.ID = 'ORFD'
ORFDOperator.prototype.name = 'overridden-function-deletion'

ORFDOperator.prototype.getMutations = function(file, source, visit) {
  const mutations = []

  visit({
    ContractDefinition: (node) => {
      if(node.baseContracts.length >0)
      visit({
        FunctionDefinition: (node) => {
          let replacement;
          if(node.override) {  
            var start = node.range[0]
            var end = node.range[1]+1
            var text = source.slice(start, end)
            replacement = '/*' + text + '*/';
            mutations.push(new Mutation(file, start, end, replacement))
          }
        }
      })
    }
  })  
  
  return mutations
}

module.exports = ORFDOperator
