const Mutation = require("../mutation");

function DLROperator() {
}

DLROperator.prototype.ID = "DLR";
DLROperator.prototype.name = "data-location-replacement";

DLROperator.prototype.getMutations = function(file, source, visit) {
  const mutations = [];

  visit({
    VariableDeclaration: (node) => {
      if (node.storageLocation) {
        const start = node.range[0];
        const end = node.range[1];
        const startLine = node.loc.start.line;
        const endLine = node.loc.start.line;   
        var replacement = source.slice(start, end + 1);
        if (node.storageLocation === "memory") {
          replacement = replacement.replace("memory", "storage");
          mutations.push(new Mutation(file, start, end + 1, startLine, endLine, replacement, this.ID));
        } else if (node.storageLocation === "storage") {
          replacement = replacement.replace("storage", "memory");
          mutations.push(new Mutation(file, start, end + 1, startLine, endLine, replacement, this.ID));
        }
      }
    }
  });
  return mutations;
};

module.exports = DLROperator;
