const contextChecker = require("../contextChecker");
const Mutation = require("../../mutation");

class AOROperator {
  constructor() {
    this.ID = "AOR";
    this.name = "assignment-operator-replacement";
  }


  /**
  * Generates AOR mutations for compound assignment operators.
  *
  * @param {string} file - The path of the Solidity source file
  * @param {string} source - The Solidity source code
  * @param {Function} visit - The solidity-parser-ast visitor function
  * 
  * @returns {Mutation[]} The generated mutations
  */
  getMutations(file, source, visit) {
    const mutations = [];
    const targets = ["+=", "-=", "*=", "/=", "%=", "<<=", ">>=", "|=", "&=", "^="];

    visit({
      BinaryOperation: (node) => {
        const start = node.left.range[1] + 1;
        const end = node.right.range[0];
        const startLine = node.left.loc.end.line;
        const endLine = node.right.loc.start.line;
        const original = source.slice(start, end);
        const functionName = contextChecker.getFunctionName(visit, startLine, endLine);

        if (targets.includes(node.operator)) {
          const replacement = original.replace(node.operator, '=');
          pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, this.ID));
        }
      },
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


module.exports = AOROperator