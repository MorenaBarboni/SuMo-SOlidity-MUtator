const contextChecker = require("../contextChecker");
const Mutation = require("../../mutation");

class BCRDOperator {
  constructor() {
    this.ID = "BCRD";
    this.name = "break-continue-replacement-deletion";
  }

 /**
 * Generates BCRD mutations for break and continue statements.
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
      BreakStatement: (node) => {
        const { range, loc } = node;
        const start = range[0];
        const end = range[1];
        const startLine = loc.start.line;
        const endLine = loc.end.line;
        const functionName = contextChecker.getFunctionName(visit, startLine, endLine);
        const original = source.slice(start, end);
        pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, "continue", this.ID));
        pushMutation(new Mutation(file, functionName, start, end + 1, startLine, endLine, original, "", this.ID));
      },
      ContinueStatement: (node) => {
        const { range, loc } = node;
        const start = range[0];
        const end = range[1];
        const startLine = loc.start.line;
        const endLine = loc.end.line;
        const functionName = contextChecker.getFunctionName(visit, startLine, endLine);
        const original = source.slice(start, end);

        pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, "break", this.ID));
        pushMutation(new Mutation(file, functionName, start, end + 1, startLine, endLine, original, "", this.ID));
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


module.exports = BCRDOperator;