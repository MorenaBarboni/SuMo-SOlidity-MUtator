const Mutation = require("../mutation");

function ORFDOperator() {
}

ORFDOperator.prototype.ID = "ORFD";
ORFDOperator.prototype.name = "overridden-function-deletion";

ORFDOperator.prototype.getMutations = function(file, source, visit) {
  const mutations = [];
  var ranges = [];

  visit({
    ContractDefinition: (node) => {
      if (node.baseContracts.length > 0)
        visit({
          FunctionDefinition: (node) => {
            if (!ranges.includes(node.range)) {
              let replacement;
              if (node.override) {
                var start = node.range[0];
                var end = node.range[1] + 1;
                const startLine = node.loc.start.line;
                const endLine = node.loc.end.line;  
                var text = source.slice(start, end);
                replacement = "/*" + text + "*/";
                mutations.push(new Mutation(file, start, end, startLine, endLine, replacement, this.ID));
              }
              ranges.push(node.range);

            }
          }
        });
    }
  });

  return mutations;
};

module.exports = ORFDOperator;
