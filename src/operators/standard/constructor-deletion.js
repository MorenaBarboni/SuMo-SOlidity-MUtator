const Mutation = require("../../mutation");


class CCDOperator {
  constructor() {
    this.ID = "CCD";
    this.name = "contract-constructor-deletion";
  }


  getMutations(file, source, visit) {
    const mutations = [];

    visit({
      FunctionDefinition: (node) => {
        if (node.isConstructor) {
          const start = node.range[0];
          const end = node.range[1] + 1;
          var lineStart = node.loc.start.line;
          var lineEnd = node.loc.end.line;
          const functionName = "constructor";

          const original = source.slice(start, end);
          const replacement = "";
          mutations.push(new Mutation(file, functionName, start, end, lineStart, lineEnd, original, replacement, this.ID));
        }
      }
    });
    return mutations;
  }
}

module.exports = CCDOperator;