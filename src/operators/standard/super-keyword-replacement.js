const contextChecker = require("../contextChecker");
const Mutation = require("../../mutation");

class SKROperator {
  constructor() {
    this.ID = "SKR";
    this.name = "super-keyword-replacement";
  }

  /**
  * Generates SKR mutations for adding and removing the super keyword
  * 
  * @param {string} file - The path of the Solidity source file
  * @param {string} source - The Solidity source code
  * @param {Function} visit - The solidity-parser-ast visitor function
  * 
  * @returns {Mutation[]} The generated mutations
  */
  getMutations(file, source, visit) {
    const mutations = [];
    const overriddenFunctions = [];
    const functionCalls = [];
    const superMemberAccesses = [];
    let hasDerivedContract = false;

    // Collect the relevant nodes
    visit({
      ContractDefinition: (node) => {
        if (node.baseContracts.length > 0) {
          hasDerivedContract = true;
        }
      },
      FunctionDefinition: (node) => {
        if (node.override) {
          overriddenFunctions.push(node);
        }
      },
      FunctionCall: (node) => {
        functionCalls.push(node);
      },
      MemberAccess: (node) => {
        if (node.expression.name === "super") {
          superMemberAccesses.push(node);
        }
      }
    });

    // Add super to calls matching an overridden function in the same contract.
    if (hasDerivedContract) {
      functionCalls.forEach(node => {
        if (overriddenFunctions.some(functionNode => functionNode.name === node.expression.name)) {
          const overriddenFunction = overriddenFunctions.filter(
            functionNode => functionNode.name === node.expression.name
          )[0];

          if (contextChecker.contractContaining(visit, overriddenFunction) === contextChecker.contractContaining(visit, node)) {
            mutateAddSuper(visit, node);
          }
        }
      });
    }

    // Remove super from existing super member accesses.
    superMemberAccesses.forEach(node => {
      mutateRemoveSuper(visit, node);
    });

    /**
     * Removes the super keyword from the node.
     *
     * @param {Function} visit the visitor
     * @param {Object} node the MemberAccess node to mutate
     */
    function mutateRemoveSuper(visit, node) {
      const start = node.expression.range[0];
      const end = node.expression.range[1] + 2;
      const startLine = node.expression.loc.start.line;
      const endLine = node.expression.loc.end.line;
      const functionName = contextChecker.getFunctionName(visit, startLine, endLine);
      const original = source.slice(start, end);
      const replacement = "";

      pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, "SKR"));
    }

    /**
     * Adds the super keyword to the node.
     *
     * @param {Function} visit the visitor
     * @param {Object} node the FunctionCall node to mutate
     */
    function mutateAddSuper(visit, node) {
      const start = node.expression.range[0];
      const end = node.expression.range[1] + 1;
      const startLine = node.expression.loc.start.line;
      const endLine = node.expression.loc.end.line;
      const functionName = contextChecker.getFunctionName(visit, startLine, endLine);
      const original = source.slice(start, end);
      const replacement = "super." + original;

      pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, "SKR"));
    }

    /**
     * Adds a mutation to the mutations list unless an equivalent mutation is already present.
     *
     * @param {Object} mutation the mutation to add
     */
    function pushMutation(mutation) {
      if (!mutations.find(m => m.id === mutation.id)) {
        mutations.push(mutation);
      }
    }

    return mutations;
  }
}

module.exports = SKROperator;