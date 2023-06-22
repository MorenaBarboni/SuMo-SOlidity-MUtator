const Mutation = require("../../mutation");

function DLROperator() {
  this.ID = "DLR";
  this.name = "data-location-replacement";
}

DLROperator.prototype.getMutations = function(file, source, visit) {
  const mutations = [];

  visit({
    VariableDeclaration: (node) => {
      if (node.storageLocation) {
        const start = node.range[0];
        const end = node.range[1] +1;
        const lineStart = node.loc.start.line;
        const lineEnd = node.loc.end.line;
        const original = source.slice(start, end);
        if (node.storageLocation === "memory") {
          replacement = original.replace("memory", "storage");
          mutations.push(new Mutation(file, start, end, lineStart, lineEnd, original, replacement, this.ID));
        } else if (node.storageLocation === "storage") {
          replacement = original.replace("storage", "memory");
          mutations.push(new Mutation(file, start, end, lineStart, lineEnd, original, replacement, this.ID));
        }
      }
    }
  });
  return mutations;
};

module.exports = DLROperator;
