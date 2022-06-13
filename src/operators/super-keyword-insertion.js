const Mutation = require("../mutation");

function SKIOperator() {
}

SKIOperator.prototype.ID = "SKI";
SKIOperator.prototype.name = "super-keyword-insertion";

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
                var end = node.expression.range[1];
                const startLine = node.expression.loc.start.line;
                const endLine = node.expression.loc.end.line;  
                var text = source.slice(start, end);
                var replacement = "super." + text;
                mutations.push(new Mutation(file, start, end, startLine, endLine, replacement, this.ID));
              }
            }
          });
    }
  });
  return mutations;
};

module.exports = SKIOperator;
