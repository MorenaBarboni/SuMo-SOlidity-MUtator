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
        const startLine = node.loc.start.line;
        const endLine = node.loc.start.line;
        const functionSignature = source.substring(node.range[0], node.range[1]);
        const replacement = functionSignature.replace("payable", "");
        mutations.push(new Mutation(file, node.range[0], node.range[1], startLine,  endLine, replacement, this.ID));
      }
    }
  });
  return mutations;
};

module.exports = PKDOperator;
