const Mutation = require("../mutation");

function RSDoperator() {
}

RSDoperator.prototype.ID = "RSD";
RSDoperator.prototype.name = "return-statement-deletion";

RSDoperator.prototype.getMutations = function(file, source, visit) {
  const mutations = [];

  visit({
    ReturnStatement: (node) => {
      const start = node.range[0];
      const end = node.range[1];

      const text = source.slice(start, end + 1);
      const replacement = "/* " + text + " */";

      mutations.push(new Mutation(file, start, end + 1, replacement, this.ID));
    }
  });

  return mutations;
};

module.exports = RSDoperator;
