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
        const start = node.range[0];
        const end = node.range[1] + 1;
        const startLine = node.loc.start.line;
        const endLine = node.loc.start.line;
        if (node.value) {
          mutations.push(new Mutation(file, start, end, startLine, endLine, "false", this.ID));
        } else {
          mutations.push(new Mutation(file, start, end, startLine, endLine, "true", this.ID));
        }
      }
      prevRange = node.range;
    }
  });
  return mutations;
};

module.exports = BLROperator;
