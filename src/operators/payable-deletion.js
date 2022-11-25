const Mutation = require("../mutation");

function PKDOperator() {
}

PKDOperator.prototype.ID = "PKD";
PKDOperator.prototype.name = "payable-keyword-deletion";

PKDOperator.prototype.getMutations = function(file, source, visit) {
  const mutations = [];

  visit({
    FunctionDefinition: (node) => {

      if (node.stateMutability === "payable" && !node.isReceiveEther && !node.isVirtual && !node.override) {
        var start = node.range[0];
        var end = node.body.range[0];
        const startLine = node.loc.start.line;
        const endLine = node.body.loc.start.line; 
        const original = source.slice(start, end); //function signature
        const replacement = original.replace(/payable(?![\s\S]*payable)/, ''); //last occurrence of payable
        mutations.push(new Mutation(file, start, end, startLine, endLine, original, replacement, this.ID));
      }
    }
  });
  return mutations;
};

module.exports = PKDOperator;
