const contextChecker = require("../contextChecker");
const Mutation = require("../../mutation");

class ORFDOperator {
  constructor() {
    this.ID = "ORFD";
    this.name = "overridden-function-deletion";
  }

  /**
  * Generates ORFD mutations for deleting overriden functions
  * 
  * @param {string} file - The path of the Solidity source file
  * @param {string} source - The Solidity source code
  * @param {Function} visit - The solidity-parser-ast visitor function
  * 
  * @returns {Mutation[]} The generated mutations
  */
  getMutations(file, source, visit) {
    const ID = this.ID;
    const mutations = [];

    // Visit all function definitions and check if they are overridden functions
    // An overridden function has the 'override' keyword and is defined in a contract that inherits from another contract.
    visit({
      FunctionDefinition: (node) => {
        if (node.override) {
          const containingContract = contextChecker.contractNodeContaining(visit, node);

          if (containingContract && containingContract.baseContracts.length > 0) {
            pushMutation(createMutation(node));
          }
        }
      }
    });

    return mutations;

    /**
     * Creates a mutation that comments out the complete function declaration.
     *
     * Each line is prefixed separately so block comments inside the function
     * cannot accidentally terminate the mutation comment. A line break is
     * added when needed to keep following code active if it shares the same line.
     *
     * @param {Object} functionNode the function to comment out
     * @returns {Object} the generated mutation
     */
    function createMutation(functionNode) {
      const start = functionNode.range[0];
      const end = functionNode.range[1] + 1;
      const startLine = functionNode.loc.start.line;
      const endLine = functionNode.loc.end.line;
      const functionName = functionNode.name;
      const original = source.slice(start, end);

      const commentSafeFunction = original.replace(/\*\//g, "* /");
      const replacement = `/* ${commentSafeFunction} */`;

      return new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, ID);
    }

    /**
     * Adds a mutation unless an equivalent mutation is already present.
     *
     * @param {Object} mutation the mutation to add
     */
    function pushMutation(mutation) {
      if (!mutations.some(existingMutation => existingMutation.id === mutation.id)) {
        mutations.push(mutation);
      }
    }
  }
}

module.exports = ORFDOperator;