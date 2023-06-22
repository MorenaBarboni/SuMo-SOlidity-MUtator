const Mutation = require('../../mutation')

function PKDOperator() {
  this.ID = "PKD";
  this.name = "payable-keyword-deletion";
}

PKDOperator.prototype.getMutations = function (file, source, visit) {
  const mutations = [];

  visit({
    FunctionDefinition: (node) => {
      if (node.stateMutability === "payable" && !node.isReceiveEther && !node.isVirtual && !node.override) {
        var start, end, startLine, endLine;
        if (node.body) {
          start = node.range[0];
          end = node.body.range[0];
          startLine = node.loc.start.line;
          endLine = node.body.loc.start.line;
        } else {
          start = node.range[0];
          end = node.range[1];
          startLine = node.loc.start.line;
          endLine = node.loc.end.line;
        }
        const original = source.slice(start, end); //function signature
        const replacement = original.replace(/payable(?![\s\S]*payable)/, ''); //last occurrence of payable
        mutations.push(new Mutation(file, start, end, startLine, endLine, original, replacement, this.ID));
      }
    }
  });
  return mutations;
};

module.exports = PKDOperator;