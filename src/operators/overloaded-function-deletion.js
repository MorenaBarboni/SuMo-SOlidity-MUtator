const Mutation = require('../mutation')

function OLFDOperator() {}

OLFDOperator.prototype.ID = 'OLFD'
OLFDOperator.prototype.name = 'overloaded-function-deletion'

OLFDOperator.prototype.getMutations = function(file, source, visit) {
  const mutations = []
  var contractFunctions = []
  var overloadedFunctions = []

  visitFunctions(mutate);

  function visitFunctions(callback) {
    /*Visit and save all contract functions */
    visit({
      FunctionDefinition: (node) => {
        if(!node.isConstructor && !node.isReceiveEther && !node.isFallback){
          contractFunctions.push(node);
        }
      }
    })
    callback();
  }

   /*Mutate overloaded functions */
   function mutate() {
    const lookup = contractFunctions.reduce((a, e) => {
      a[e.name] = ++a[e.name] || 0;
      return a;
    }, {});
    overloadedFunctions = contractFunctions.filter(e => lookup[e.name])
    overloadedFunctions.forEach(node => {
      var start = node.range[0]
      var end = node.range[1]
      var text = source.slice(start, end+1)
      replacement = '/*' + text + '*/';
      mutations.push(new Mutation(file, start, end+1, replacement))
    });        
   }  
  return mutations
}

module.exports = OLFDOperator
