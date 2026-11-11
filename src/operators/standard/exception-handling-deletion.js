const contextChecker = require("../contextChecker");
const Mutation = require("../../mutation");

class EHDOperator {
  constructor() {
    this.ID = "EHD";
    this.name = "exception-handling-statement-deletion";
  }
  /**
  * Generates EHD mutations for Solidity-native exception handling statements.
  *
  * @param {string} file - The path of the Solidity source file
  * @param {string} source - The Solidity source code
  * @param {Function} visit - The solidity-parser-ast visitor function
  * 
  * @returns {Mutation[]} The generated mutations
  */
  getMutations(file, source, visit) {
    const mutations = [];
    const functions = ["require", "assert", "revert"];

    visit({
      FunctionCall: (node) => {
        if (functions.includes(node.expression.name)) {
          //EHD - Exception Handling statement Deletion
          const start = node.range[0];
          const temp = source.slice(start);
          const delimiter = temp.indexOf(";");
          const end = start + delimiter + 1;
          const startLine = node.loc.start.line;
          const endLine = node.loc.end.line;
          const functionName = contextChecker.getFunctionName(visit, startLine, endLine);
          const original = source.slice(start, end);
          const replacement = "/* " + original + " */";
          pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, this.ID));
        }
      }
    });

    visit({
      RevertStatement: (node) => {
        const start = node.range[0];
        const temp = source.slice(start);
        const delimiter = temp.indexOf(";");
        const end = start + delimiter + 1;
        const startLine = node.loc.start.line;
        const endLine = node.loc.end.line;
        const functionName = contextChecker.getFunctionName(visit, startLine, endLine);
        const original = source.slice(start, end);
        const replacement = "/* " + original + " */";
        pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, this.ID));
      }
    });

    /**
    * Push a mutation to the generated mutations list
    * @param {Object} mutation the mutation
    */
    function pushMutation(mutation) {
      if (!mutations.find(m => m.id === mutation.id)) {
        mutations.push(mutation);
      }
    }

    return mutations;
  }
}


module.exports = EHDOperator;