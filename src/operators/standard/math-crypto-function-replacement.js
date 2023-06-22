const Mutation = require('../../mutation')

function MCROperator() {
  this.ID = "MCR";
  this.name = "math-and-crypto-function-replacement";
}

MCROperator.prototype.getMutations = function(file, source, visit) {
  const mutations = [];
  const functions = ["addmod", "mulmod", "keccak256", "sha256", "ripemd160"];
  var ranges = []; //Visited node ranges

  visit({
    FunctionCall: (node) => {
      if (!ranges.includes(node.range)) {
        if (functions.includes(node.expression.name)) {
          ranges.push(node.range);
          const start = node.expression.range[0];
          const end = node.expression.range[1] + 1;
          const startLine =  node.expression.loc.start.line;
          const endLine =  node.expression.loc.end.line;
          var original = source.slice(start,end);

          switch (node.expression.name) {
            case "addmod":
              mutations.push(new Mutation(file, start, end, startLine, endLine, original, "mulmod", this.ID));
              break;
            case "mulmod":
              mutations.push(new Mutation(file, start, end, startLine, endLine, original, "addmod", this.ID));
              break;
            case "keccak256":
              mutations.push(new Mutation(file, start, end, startLine, endLine, original, "sha256", this.ID));
              break;
            case "sha256":
              mutations.push(new Mutation(file, start, end, startLine, endLine, original, "keccak256", this.ID));
              break;
            case "ripemd160":
              mutations.push(new Mutation(file, start, end, startLine, endLine, original, "sha256", this.ID));
              break;
          }
        }
      }
    }
  });
  return mutations;
};

module.exports = MCROperator;
