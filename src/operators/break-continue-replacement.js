const Mutation = require('../mutation')

function BCRDOperator() {}

BCRDOperator.prototype.ID = 'BCRD'
BCRDOperator.prototype.name = 'break-continue-replacement-deletion'

BCRDOperator.prototype.getMutations = function(file, source, visit) {
  const mutations = []

    visit({
      BreakStatement: (node) => {
        var start = node.range[0]
        var end = node.range[1]
        mutations.push(new Mutation(file, start, end, 'continue'))
        mutations.push(new Mutation(file, start, end+1, ''))

      }
    }),
    visit({
      ContinueStatement: (node) => {
        var start = node.range[0]
        var end = node.range[1]
        mutations.push(new Mutation(file, start, end, 'break'))
        mutations.push(new Mutation(file, start, end+1, ''))
      }
    })       
 
  return mutations
}

module.exports = BCRDOperator
