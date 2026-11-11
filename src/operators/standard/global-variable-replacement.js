const contextChecker = require("../contextChecker");
const Mutation = require('../../mutation')

class GVROperator {
  constructor() {
    this.ID = "GVR";
    this.name = "global-variable-replacement";
  }
  /**
  * Generates GVR mutations blockchain for global variables and functions.
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
      MemberAccess: (node) => {
        // Only direct accesses to global objects are relevant.
        if (!node.expression || node.expression.type !== "Identifier") {
          return;
        }

        // Ignore AST nodes without usable source coordinates.
        if (!node.range || !node.loc) {
          return;
        }

        const objectName = node.expression.name;
        const memberName = node.memberName;
        const start = node.range[0];
        const end = node.range[1] + 1;
        const startLine = node.loc.start.line;
        const endLine = node.loc.end.line;
        const functionName = contextChecker.getFunctionName(visit, startLine, endLine);
        const original = source.slice(start, end);

        if (objectName === "msg" && memberName === "value") {
          pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, `(${original} + 1)`, ID));
          pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, `(${original} - 1)`, ID));
        }
        else if (objectName === "tx" && memberName === "gasprice") {
          pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, `(${original} + 1)`, ID));
          pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, `(${original} - 1)`, ID));
        }
        else if (objectName === "block") {
          if (memberName === "basefee" || memberName === "blobbasefee") {
            pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, `(${original} + 1)`, ID));
            pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, `(${original} - 1)`, ID));
          }
          else if (memberName === "chainid") {
            pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, `(${original} - 1)`, ID));
          }
          else if (memberName === "coinbase") {
            pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, "payable(msg.sender)", ID));
          }
          else if (memberName === "difficulty") {
            pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, `(${original} + 1)`, ID));
            pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, `(${original} - 1)`, ID));
          }
          else if (memberName === "gaslimit" || memberName === "number") {
            pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, `(${original} + 1)`, ID));
            pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, `(${original} - 1)`, ID));
          }
          else if (memberName === "timestamp") {
            pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, `(${original} + 1)`, ID));
            pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, `(${original} - 1)`, ID));
            // Optional larger timestamp shifts
            // pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, `(${original} + 12)`, ID));
            // pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, `(${original} - 12)`, ID));
          }
        }
      },

      FunctionCall: (node) => {
        // Only calls to directly named global functions are relevant.
        if (!node.expression || node.expression.type !== "Identifier") {
          return;
        }

        // Ignore AST nodes without usable source coordinates or arguments.
        if (!node.range || !node.loc || !Array.isArray(node.arguments)) {
          return;
        }

        const functionCallName = node.expression.name;
        const isGasleft = functionCallName === "gasleft" && node.arguments.length === 0;
        const isBlockhash = functionCallName === "blockhash" && node.arguments.length === 1;

        if (!isGasleft && !isBlockhash) {
          return;
        }

        const start = node.range[0];
        const end = node.range[1] + 1;
        const startLine = node.loc.start.line;
        const endLine = node.loc.end.line;
        const functionName = contextChecker.getFunctionName(visit, startLine, endLine);
        const original = source.slice(start, end);

        if (isGasleft) {
          pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, `(${original} + 1)`, ID));
          pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, `(${original} - 1)`, ID));
        } else if (isBlockhash) {
          // Use the original argument instead of replacing it with unrelated values.
          const argument = node.arguments[0];
          if (argument && argument.range) {
            const argumentStart = argument.range[0];
            const argumentEnd = argument.range[1] + 1;
            const argumentSource = source.slice(argumentStart, argumentEnd);
            const plusOne = `blockhash((${argumentSource}) + 1)`;
            const minusOne = `blockhash((${argumentSource}) - 1)`;
            pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, plusOne, ID));
            pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, minusOne, ID));
          }
          // A zero hash models an unavailable historical block hash.
          pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, "bytes32(0)", ID));
        }
      },
    });

    /**
     * Adds a mutation unless another mutation has the same identifier.
     * @param {Mutation} mutation The mutation to add.
     */
    function pushMutation(mutation) {
      if (!mutations.find(m => m.id === mutation.id)) {
        mutations.push(mutation);
      }
    }

    return mutations;
  }
}

module.exports = GVROperator
