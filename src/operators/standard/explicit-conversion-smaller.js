const contextChecker = require("../contextChecker");
const Mutation = require("../../mutation");

class ECSOperator {
  constructor() {
    this.ID = "ECS";
    this.name = "explicit-conversion-to-smaller-type";
  }

  getMutations(file, source, visit) {
    const mutations = [];
   
    visit({
      FunctionCall: (node) => {
        if (node.expression.type === "ElementaryTypeName") {
          const type = node.expression.name;
          const args = source.slice(node.expression.range[1] + 2, node.range[1]);
          const start = node.range[0];
          const end = node.range[1] + 1;
          const startLine = node.loc.start.line;
          const endLine = node.loc.end.line;
          const functionName = contextChecker.getFunctionName(visit, startLine, endLine);
          const original = source.slice(start, end);
          let replacement;

          if (type.startsWith("uint") && type !== "uint8") {
            replacement = original.replace(type, reduceType(type));
            pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, this.ID));
          }
          else if (type.startsWith("int") && type !== "int8") {
            replacement = original.replace(type, reduceType(type));
            pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, this.ID));
          }
          else if (type.startsWith("bytes")) {
            if (type !== "bytes" && type !== "bytes1") {
              replacement = original.replace(type, reduceType(type));
              pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, this.ID));
            }
          }
        }
      }
    });

    /**
     * Reduces a uint, int or bytes type
     * @param {String} input the input type
     * @returns the same type but one step down
     */
    function reduceType(input) {
      const uintRegex = /^uint([0-9]*)$/;
      const intRegex = /^int([0-9]*)$/;
      const bytesRegex = /^bytes([0-9]*)$/;

      let match;
      if ((match = uintRegex.exec(input))) {
        const size = parseInt(match[1] || "256");
        if (size <= 8) {
          return "uint8";
        } else {
          return `uint${size - 8}`;
        }
      } else if ((match = intRegex.exec(input))) {
        const size = parseInt(match[1] || "256");
        if (size <= 8) {
          return "int8";
        } else {
          return `int${size - 8}`;
        }
      } else if ((match = bytesRegex.exec(input))) {
        const size = parseInt(match[1] || "32");
        if (size <= 1) {
          return "bytes1";
        } else {
          return `bytes${size - 1}`;
        }
      }
      return input;
    }

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

module.exports = ECSOperator;
