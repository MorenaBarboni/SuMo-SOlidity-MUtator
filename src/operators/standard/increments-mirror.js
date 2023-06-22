const Mutation = require('../../mutation')

function ICMOperator() {
  this.ID = "ICM";
  this.name = "increments-mirror";
}

ICMOperator.prototype.getMutations = function(file, source, visit) {
  const mutations = [];

  visit({
    BinaryOperation: (node) => {
      const start = node.left.range[1] + 1;
      const end = node.right.range[0];
      const startLine =  node.left.loc.end.line;
      const endLine =  node.right.loc.start.line;
      const original = source.slice(start, end);

      let replacement;

      if (node.operator == "-=") {
        replacement = original.replace("-=", "=-");
      }

      if (replacement) {
        mutations.push(new Mutation(file, start, end, startLine, endLine, original, replacement, this.ID));
      }
    }
  });

  return mutations;
};

module.exports = ICMOperator;
