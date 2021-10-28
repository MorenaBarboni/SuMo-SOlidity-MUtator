const Mutation = require('../mutation')

function MCROperator() {}

MCROperator.prototype.ID = 'MCR'
MCROperator.prototype.name = 'math-and-crypto-function-replacement'

MCROperator.prototype.getMutations = function(file, source, visit) {
  const mutations = []
  const functions = ['addmod','mulmod', 'keccak256', 'sha256', 'ripemd160']
  var ranges = [] //Visited node ranges

  visit({
    FunctionCall: (node) => {
      if(!ranges.includes(node.range)){
       if(functions.includes(node.expression.name)){
        ranges.push(node.range);
        const start = node.expression.range[0];
        const end = node.expression.range[1];
        var m;

        switch (node.expression.name) {
          case 'addmod':
            mutations.push(new Mutation(file, start, end + 1, 'mulmod'))
            break;
          case 'mulmod':
            mutations.push(new Mutation(file, start, end + 1, 'addmod'))
            break;
          case 'keccak256':
            mutations.push(new Mutation(file, start, end + 1, 'sha256'))
            mutations.push(new Mutation(file, start, end + 1, 'ripemd160'))
            break;
          case 'sha256':
            mutations.push(new Mutation(file, start, end + 1, 'keccak256'))
            mutations.push(new Mutation(file, start, end + 1, 'ripemd160'))
            break;
          case 'ripemd160':
            mutations.push(new Mutation(file, start, end + 1, 'sha256'))
            mutations.push(new Mutation(file, start, end + 1, 'keccak256'))
            break;
          }
      }  
    }
    }      
  })
  return mutations
}

module.exports = MCROperator
