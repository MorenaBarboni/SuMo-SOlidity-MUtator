const contextChecker = require("../contextChecker");
const Mutation = require("../../mutation");

class MCROperator {
  constructor() {
    this.ID = "MCR";
    this.name = "math-and-crypto-function-replacement";
  }
  /**
  * Generates MCR mutations for compatible Solidity built-in function calls
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
      FunctionCall: (node) => {
        // Only unqualified identifier calls can be Solidity built-ins
        if (!node.expression || node.expression.type !== "Identifier") {
          return;
        }

        const expression = node.expression;
        // Restrict the operator to supported native Solidity functions
        if (!["addmod", "mulmod", "keccak256", "sha256"].includes(expression.name)) {
          return;
        }

        // Hash functions take one argument, while modular functions take three
        const expectedArguments = expression.name === "addmod" || expression.name === "mulmod" ? 3 : 1;
        if (!Array.isArray(node.arguments) || node.arguments.length !== expectedArguments) {
          return;
        }

        // Skip nodes without trustworthy source ranges or locations
        if (!expression.range || !expression.loc) {
          return;
        }

        const start = expression.range[0];
        const end = expression.range[1] + 1;
        const startLine = expression.loc.start.line;
        const endLine = expression.loc.end.line;
        const original = source.slice(start, end);

        // Make sure the source actually contains the expected identifier.
        if (original !== expression.name) {
          return;
        }

        const functionName = contextChecker.getFunctionName(visit, startLine, endLine);
        const ID = this.ID;

        if (expression.name === "addmod") {
          pushMutations(new Mutation(file, functionName, start, end, startLine, endLine, original, "mulmod", ID));
        }
        else if (expression.name === "mulmod") {
          pushMutations(new Mutation(file, functionName, start, end, startLine, endLine, original, "addmod", ID));
        }
        else if (expression.name === "keccak256") {
          pushMutations(new Mutation(file, functionName, start, end, startLine, endLine, original, "sha256", ID));
        }
        else if (expression.name === "sha256") {
          pushMutations(new Mutation(file, functionName, start, end, startLine, endLine, original, "keccak256", ID));
        }
      }
    });

    /**
     * Adds a mutation unless an identical mutation has already been recorded.
     *
     * @param {Mutation} mutation - Mutation to add.
     */
    function pushMutations(mutation) {
      if (!mutations.find(existing => existing.id === mutation.id)) {
        mutations.push(mutation);
      }
    }

    return mutations;
  }
}

module.exports = MCROperator;
