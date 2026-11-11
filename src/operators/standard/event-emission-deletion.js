const contextChecker = require("../contextChecker");
const Mutation = require("../../mutation");

class EEDOperator {
  constructor() {
    this.ID = "EED";
    this.name = "event-emission-deletion";
  }
  /**
  * Generates EED mutations for event emission statements.
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
      EmitStatement: (node) => {
        const start = node.range[0];
        const end = node.range[1] + 1;
        const startLine = node.loc.start.line;
        const endLine = node.loc.end.line;
        const functionName = contextChecker.getFunctionName(visit, startLine, endLine);
        const original = source.slice(start, end);
        const replacement = "/* " + original + " */";

        mutations.push(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, this.ID));
      }
    });
    return mutations;
  }
}


module.exports = EEDOperator;
