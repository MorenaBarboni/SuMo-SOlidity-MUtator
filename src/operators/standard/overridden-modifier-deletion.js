const contextChecker = require("../contextChecker");
const Mutation = require("../../mutation");

class OMDOperator {
  constructor() {
    this.ID = "OMD";
    this.name = "overridden-modifier-deletion";
  }
  /**
  * Generates OMD mutations for deleting overriden modifiers
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

    visit({
      ModifierDefinition: (node) => {
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
     * Creates a mutation that wraps the complete modifier declaration in a block comment.
     *
     * Existing block-comment closing delimiters are separated to prevent
     * prematurely terminating the comment surrounding the modifier.
     *
     * @param {Object} modifierNode the modifier to comment out
     * @returns {Object} the generated mutation
     */
    function createMutation(modifierNode) {
      const start = modifierNode.range[0];
      const end = modifierNode.range[1] + 1;
      const startLine = modifierNode.loc.start.line;
      const endLine = modifierNode.loc.end.line;
      const modifierName = modifierNode.name;
      const original = source.slice(start, end);

      const commentSafeModifier = original.replace(/\*\//g, "* /");
      const replacement = `/* ${commentSafeModifier} */`;

      return new Mutation(file, modifierName, start, end, startLine, endLine, original, replacement, ID);
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

module.exports = OMDOperator;