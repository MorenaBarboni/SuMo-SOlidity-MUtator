const Mutation = require("../mutation");

function BLROperator() {
}

BLROperator.prototype.ID = "BLR";
BLROperator.prototype.name = "boolean-literal-replacement";

BLROperator.prototype.getMutations = function(file, source, visit) {
  const mutations = [];
  var prevRange;

  visit({
    BooleanLiteral: (node) => {
      if (prevRange != node.range) { //Avoid duplicate mutants
        if (node.value) {
          mutations.push(new Mutation(file, node.range[0], node.range[1] + 1, "false", this.ID));
        } else {
          mutations.push(new Mutation(file, node.range[0], node.range[1] + 1, "true", this.ID));
        }
      }
      prevRange = node.range;
    }
  });
  return mutations;
};

module.exports = BLROperator;
