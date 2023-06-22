const Mutation = require("../../mutation");

function BLROperator() {
  this.ID = "BLR";
  this.name = "boolean-literal-replacement";
}

BLROperator.prototype.getMutations = function(file, source, visit) {
  const mutations = [];
  var prevRange;

  visit({
    BooleanLiteral: (node) => {
      const start = node.range[0]
      const end = node.range[1] + 1
      const startLine =  node.loc.start.line;
      const endLine =  node.loc.end.line;
      const original = source.slice(start, end)

      if (prevRange != node.range) { //Avoid duplicate mutants
        if (node.value) {
          mutations.push(new Mutation(file, start, end, startLine, endLine, original, "false", this.ID));
        } else {
          mutations.push(new Mutation(file, start, end, startLine, endLine, original, "true", this.ID));
        }
      }
      prevRange = node.range;
    }
  });
  return mutations;
};

module.exports = BLROperator;
