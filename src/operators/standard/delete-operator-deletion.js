const Mutation = require("../../mutation");

function DODOperator() {
  this.ID = "DOD";
  this.name = "delete-operator-deletion";
}

DODOperator.prototype.getMutations = function(file, source, visit) {
  const mutations = [];
  visit({
    UnaryOperation: (node) => {
      if (node.operator == "delete") {
        const start = node.range[0];
        const end = node.range[1]  + 1;
        const startLine =  node.loc.start.line;
        const endLine =  node.loc.end.line;
        const original = source.slice(start, end)
        var replacement = source.slice(node.subExpression.range[0], node.subExpression.range[1] + 1);
        mutations.push(new Mutation(file, start, end, startLine, endLine, original, replacement, this.ID));
      }
    }
  });
  return mutations;
};

module.exports = DODOperator;
