const contextChecker = require("../contextChecker");
const Mutation = require("../../mutation");

class DLROperator {
  constructor() {
    this.ID = "DLR";
    this.name = "data-location-replacement";
  }

  getMutations(file, source, visit) {
    const mutations = [];

    visit({
      VariableDeclaration: (node) => {
        if (node.storageLocation) {
          const start = node.range[0];
          const end = node.range[1] + 1;
          const startLine = node.loc.start.line;
          const endLine = node.loc.end.line;
          const original = source.slice(start, end);
          const functionName = contextChecker.getFunctionName(visit, startLine, endLine);

          if (node.storageLocation === "memory") {
            let replacement = original.replace("memory", "storage");
            mutations.push(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, this.ID));
          } else if (node.storageLocation === "storage") {
            let replacement = original.replace("storage", "memory");
            mutations.push(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, this.ID));
          }
        }
      }
    });

    return mutations;
  }
}


module.exports = DLROperator;