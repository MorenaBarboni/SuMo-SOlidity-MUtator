const Mutation = require('../../mutation')

function OMDOperator() {
  this.ID = "OMD";
  this.name = "overridden-modifier-deletion";
}

OMDOperator.prototype.getMutations = function(file, source, visit) {
  const mutations = [];

  visit({
    ContractDefinition: (node) => {
      if (node.baseContracts.length > 0)
        visit({
          ModifierDefinition: (node) => {
            if (node.override) {
              var start = node.range[0];
              var end = node.range[1] + 1;
              const startLine = node.loc.start.line;
              const endLine = node.loc.end.line; 
              var original = source.slice(start, end);
              replacement = "";
              mutations.push(new Mutation(file, start, end, startLine, endLine, original, replacement, this.ID));
            }
          }
        });
    }
  });

  return mutations;
};

module.exports = OMDOperator;
