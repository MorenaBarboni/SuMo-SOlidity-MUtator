const Mutation = require('../../mutation')

function SKIOperator() {
  this.ID = "SKI";
  this.name = "super-keyword-insertion";
}

SKIOperator.prototype.getMutations = function(file, source, visit) {
  const mutations = [];
  const overriddenFunctions = [];

  visit({
    ContractDefinition: (node) => {
      if (node.baseContracts.length > 0)
        visit({
          FunctionDefinition: (node) => {
            if (node.override) {
              overriddenFunctions.push(node.name);
            }
          }
        }),
          visit({
            FunctionCall: (node) => {
              if (overriddenFunctions.includes(node.expression.name)) {
                var start = node.expression.range[0];
                var end = node.expression.range[1] + 1;

                const startLine = node.expression.loc.start.line;
                const endLine = node.expression.loc.end.line;
                const original = source.slice(start, end);

                const replacement = "super." + original;
                const mutation = new Mutation(file, start, end, startLine, endLine, original, replacement, this.ID);
            
                if (!mutations.find(m => m.id === mutation.id)) {
                  mutations.push(mutation);
                }
              }
            }
          });
    }
  });
  return mutations;
};

module.exports = SKIOperator;