const Mutation = require("../mutation");

function PKDOperator() {
}

PKDOperator.prototype.ID = "PKD";
PKDOperator.prototype.name = "payable-keyword-deletion";

PKDOperator.prototype.getMutations = function(file, source, visit) {
  const mutations = [];

  visit({
    FunctionDefinition: (node) => {
      let replacement;
      if (node.stateMutability === "payable" && !node.isReceiveEther && !node.isVirtual && !node.override) {
        var functionSignature = source.substring(node.range[0], node.range[1]);
        replacement = functionSignature.replace("payable", "");
        mutations.push(new Mutation(file, node.range[0], node.range[1], replacement, this.ID));
      }
    }
  });
  return mutations;
};

module.exports = PKDOperator;
