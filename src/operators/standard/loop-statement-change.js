const contextChecker = require("../contextChecker");
const Mutation = require("../../mutation");

class LSCOperator {
  constructor() {
    this.ID = "LSC";
    this.name = "loop-statement-change";
  }

  /**
  * Generates LSC mutations for loop conditions
  * 
  * @param {string} file - The path of the Solidity source file
  * @param {string} source - The Solidity source code
  * @param {Function} visit - The solidity-parser-ast visitor function
  * 
  * @returns {Mutation[]} The generated mutations
  */
  getMutations(file, source, visit) {
    const mutations = [];
    const ID = this.ID;

    visit({

      // LSC changes a canonical zero-based counter to one to skip the first iteration.
      // LSC also changes the condition of a for loop to false to skip all iterations.
      ForStatement: (node) => {
        // Mutate the condition of a for loop to false
        if (contextChecker.hasSourceLocation(node.conditionExpression)) {
          pushExpressionMutation(node.conditionExpression, "false");
        }
        // Mutate the zero-based counter to one
        const initializer = contextChecker.getZeroBasedLoopInitializer(node, source);
        if (contextChecker.hasSourceLocation(initializer)) {
          pushExpressionMutation(initializer, "1");
        }
      },

      // LSC changes the condition of a while loop to false.
      WhileStatement: (node) => {
        if (contextChecker.hasSourceLocation(node.condition)) {
          pushExpressionMutation(node.condition, "false");
        }
      }
    });

    /**
     * Creates a replacement mutation for an expression using its source range.
     *
     * @param {Object} node An expression with a source range and location.
     * @param {string} replacement The replacement source text.
     * @returns {void}
     */
    function pushExpressionMutation(node, replacement) {
      const start = node.range[0];
      const end = node.range[1] + 1;
      const startLine = node.loc.start.line;
      const endLine = node.loc.end.line;
      const functionName = contextChecker.getFunctionName(visit, startLine, endLine);
      const original = source.slice(start, end);

      pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, ID));
    }

    /**
     * Adds a mutation unless one with the same identifier already exists.
     *
     * @param {Mutation} mutation The candidate mutation.
     * @returns {void}
     */
    function pushMutation(mutation) {
      if (!mutations.find(m => m.id === mutation.id)) {
        mutations.push(mutation);
      }
    }

    return mutations;
  }
}

module.exports = LSCOperator;