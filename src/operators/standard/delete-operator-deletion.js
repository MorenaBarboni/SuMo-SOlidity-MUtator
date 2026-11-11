const contextChecker = require("../contextChecker");
const Mutation = require("../../mutation");

class DODOperator {
  constructor() {
    this.ID = "DOD";
    this.name = "delete-operator-deletion";
  }
  /**
  * Generates DOD mutations for delete operators.
  *
  * @param {string} file - The path of the Solidity source file
  * @param {string} source - The Solidity source code
  * @param {Function} visit - The solidity-parser-ast visitor function
  * 
  * @returns {Mutation[]} The generated mutations
  */
  getMutations(file, source, visit) {
    const mutations = [];
    visit({
      UnaryOperation: (node) => {
        if (node.operator == "delete") {
          const start = node.range[0];
          const end = node.range[1] + 1;
          const startLine = node.loc.start.line;
          const endLine = node.loc.end.line;
          const original = source.slice(start, end);
          const functionName = contextChecker.getFunctionName(visit, startLine, endLine);

          var replacement = source.slice(node.subExpression.range[0], node.subExpression.range[1] + 1);
          mutations.push(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, this.ID));
        }
      }
    });
    return mutations;
  }
}


module.exports = DODOperator;
