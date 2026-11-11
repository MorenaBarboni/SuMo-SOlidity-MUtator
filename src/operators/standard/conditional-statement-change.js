const contextChecker = require("../contextChecker");
const Mutation = require("../../mutation");

class CSCOperator {
  constructor() {
    this.ID = "CSC";
    this.name = "conditional-statement-change";
  }
  /**
  * Generates CSC mutations for conditional statements.
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
      IfStatement: (node) => {
        var start = node.condition.range[0];
        var end = node.condition.range[1] + 1;
        var startLine = node.condition.loc.start.line;
        var endLine = node.condition.loc.end.line;
        const functionName = contextChecker.getFunctionName(visit, startLine, endLine);
        var original = source.slice(start, end);

        mutations.push(new Mutation(file, functionName, start, end, startLine, endLine, original, "true", this.ID));
        mutations.push(new Mutation(file, functionName, start, end, startLine, endLine, original, "false", this.ID));

        if (node.falseBody && !node.falseBody.trueBody) { //If this is the last falseBody
          start = node.trueBody.range[1] + 2;
          end = node.falseBody.range[1] + 1;
          startLine = node.trueBody.loc.end.line;
          endLine = node.falseBody.loc.end.line;
          original = source.slice(start, end);
          var replacement = "";
          mutations.push(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, this.ID));
        }
      }
    });

    return mutations;
  }
}


module.exports = CSCOperator;