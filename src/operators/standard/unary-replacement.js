const contextChecker = require("../contextChecker");
const Mutation = require("../../mutation");

class UORDOperator {
  constructor() {
    this.ID = "UORD";
    this.name = "unary-operator-replacement";
  }

  /**
  * Generates UORD mutations for unary-operator expressions
  * 
  * @param {string} file - The path of the Solidity source file
  * @param {string} source - The Solidity source code
  * @param {Function} visit - The solidity-parser-ast visitor function
  * 
  * @returns {Mutation[]} The generated mutations
  */
  getMutations(file, source, visit) {
    const mutations = [];
    const loopProgressions = [];
    const ID = this.ID;

    // UORD skips mutations for unary operators that are used as the update clause of 
    // a for loop (e.g., i++) because loop mutations are handled by the LSC operator.
    visit({
      ForStatement: (node) => {
        const progression = contextChecker.getProgressionExpression(node.loopExpression);

        if (progression && progression.range) {
          // Record the update clause so every unary operation inside it is excluded.
          loopProgressions.push(progression);
        }
      }
    });

    visit({
      UnaryOperation: (node) => {
        if (!contextChecker.hasSourceLocation(node)) {
          return;
        }

        // Loop progression belongs to LSC, so UORD does not mutate it at all.
        if (loopProgressions.some(progression => contextChecker.containsRange(progression, node))) {
          return;
        }

        let replacement, replacement2 = null;

        switch (node.operator) {
          // UORDa - Unary Operator Replacement (Arithmetic).
          case "++":
            replacement = "--";
            replacement2 = " ";
            break;
          case "--":
            replacement = "++";
            replacement2 = " ";
            break;
          case "-":
            replacement = " ";
            break;
          case "~":
            replacement = " ";
            break;
          // UORDc - Unary Operator Replacement (Conditional).
          case "!":
            replacement = " ";
            break;
          default:
            return;
        }

        const operatorRange = contextChecker.getUnaryOperatorRange(node);
        const start = operatorRange.start;
        const end = operatorRange.end;
        const original = source.slice(start, end);
        const startLine = node.loc.start.line;
        const endLine = node.loc.end.line;
        const functionName = contextChecker.getFunctionName(visit, startLine, endLine);

        if (replacement) {
          pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, ID));
        }

        if (replacement2) {
          pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement2, ID));
        }
      }
    });

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

module.exports = UORDOperator;