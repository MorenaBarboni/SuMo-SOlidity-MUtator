const Mutation = require("../mutation");

function SLRoperator() {
}

SLRoperator.prototype.ID = "SLR";
SLRoperator.prototype.name = "string-literal-replacement";

SLRoperator.prototype.getMutations = function(file, source, visit) {
  const mutations = [];
  var prevRange;

  visit({
    StringLiteral: (node) => {
      if (prevRange != node.range) {
        if (node.value) {
          mutations.push(new Mutation(file, node.range[0], node.range[1] + 1, "\"\"", this.ID));
        }
      }
      prevRange = node.range;
    }
  });
  return mutations;
};

module.exports = SLRoperator;
