const Mutation = require("../mutation");

function DODOperator() {
}

DODOperator.prototype.ID = "DOD";
DODOperator.prototype.name = "delete-operator-deletion";

DODOperator.prototype.getMutations = function(file, source, visit) {
  const mutations = [];
  visit({
    UnaryOperation: (node) => {
      if (node.operator == "delete") {
        const start = node.range[0];
        const end = node.range[1];
        var replacement = source.slice(node.subExpression.range[0], node.subExpression.range[1] + 1);
        mutations.push(new Mutation(file, start, end + 1, replacement, this.ID));
      }
    }
  });
  return mutations;
};

module.exports = DODOperator;
