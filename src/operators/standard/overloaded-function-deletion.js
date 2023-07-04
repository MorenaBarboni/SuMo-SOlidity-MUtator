const Mutation = require('../../mutation')

function OLFDOperator() {
  this.ID = "OLFD";
  this.name = "overloaded-function-deletion";
}

OLFDOperator.prototype.getMutations = function(file, source, visit) {

  const ID = this.ID;
  const mutations = [];
  var ranges = [];
  var contractFunctions = [];
  var overloadedFunctions = [];

  visitFunctions(mutate);

  function visitFunctions(callback) {
    /*Visit and save all contract functions */
    visit({
      FunctionDefinition: (node) => {
        if (!ranges.includes(node.range)) {
          if (!node.isConstructor && !node.isReceiveEther && !node.isFallback) {
            contractFunctions.push(node);
          }
        }
        ranges.push(node.range);
      }
    });
    callback();
  }

  /*Mutate overloaded functions */
  function mutate() {
    const lookup = contractFunctions.reduce((a, e) => {
      a[e.name] = ++a[e.name] || 0;
      return a;
    }, {});
    overloadedFunctions = contractFunctions.filter(e => lookup[e.name]);
    overloadedFunctions.forEach(node => {
      //Overridden functions are mutated by ORFD
      if (!node.override) {
        var start = node.range[0];
        var end = node.range[1] +1;
        const startLine = node.loc.start.line;
        const endLine = node.loc.end.line; 
        const original = source.slice(start, end);
        const replacement = "";
        mutations.push(new Mutation(file, start, end, startLine, endLine, original, replacement, ID));
      }
    });
  }

  return mutations;
};

module.exports = OLFDOperator;
