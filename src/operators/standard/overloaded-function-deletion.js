const contextChecker = require("../contextChecker");
const Mutation = require("../../mutation");

class OLFDOperator {
  constructor() {
    this.ID = "OLFD";
    this.name = "overloaded-function-deletion";
  }

  /**
  * Generates OLFD mutations for deleting overloaded functions
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
    const functionNodes = [];

    // Collect all function definitions that are not constructors, receive, or fallback functions
    visit({
      FunctionDefinition: (node) => {
        if (!node.isConstructor && !node.isReceiveEther && !node.isFallback && node.name) {
          functionNodes.push(node);
        }
      }
    });

    // Keep overloads separate when identical names belong to different contracts.
    const functionsByScope = new Map();
    const sourceUnitScope = {};

    for (const functionNode of functionNodes) {
      const containingContract = contextChecker.contractContaining(visit, functionNode);
      const scope = containingContract || sourceUnitScope;

      let functionsByName = functionsByScope.get(scope);
      if (!functionsByName) {
        functionsByName = new Map();
        functionsByScope.set(scope, functionsByName);
      }

      let overloadedFunctions = functionsByName.get(functionNode.name);
      if (!overloadedFunctions) {
        overloadedFunctions = [];
        functionsByName.set(functionNode.name, overloadedFunctions);
      }

      overloadedFunctions.push(functionNode);
    }

    // Only functions sharing a name in the same scope form an overload set
    for (const functionsByName of functionsByScope.values()) {
      for (const overloadedFunctions of functionsByName.values()) {
        if (overloadedFunctions.length > 1) {
          for (const functionNode of overloadedFunctions) {
            // Overridden functions are handled by ORFD.
            if (!functionNode.override) {
              pushMutation(createMutation(functionNode));
            }
          }
        }
      }
    }

    return mutations;

    /**
     * Creates a mutation that comments out the complete function declaration.
     *
     * Each line is prefixed separately so block comments inside the function
     * cannot accidentally terminate the mutation comment. A line break is
     * added when needed so code following the function on the same source
     * line remains active.
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

module.exports = OLFDOperator;