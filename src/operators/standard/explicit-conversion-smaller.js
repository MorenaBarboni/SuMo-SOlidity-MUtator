const contextChecker = require("../contextChecker");
const Mutation = require("../../mutation");

class ECSOperator {
  constructor() {
    this.ID = "ECS";
    this.name = "explicit-conversion-to-smaller-type";
  }
  /**
   * Generates ECS mutants for eligible explicit casting expressions.
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
      FunctionCall: (node, parent) => {
        if (!node.expression || node.expression.type !== "ElementaryTypeName") {
          return;
        }

        if (!node.arguments || node.arguments.length !== 1) {
          return;
        }

        const typeNode = node.expression;
        const type = typeNode.name;
        const smallerType = reduceType(type);


        if (!smallerType) {
          return;
        }

        const argument = node.arguments[0];

        // Skip literal conversions to avoid equivalent or uncompilable mutants
        if (isLiteral(argument)) {
          return;
        }

        // Skip conversions where narrowing cannot change the result
        if (isObviouslyEquivalent(argument, smallerType)) {
          return;
        }

        // Skip conversions known to violate Solidity's type conversion rules
        if (hasKnownInvalidConversion(argument, type, smallerType, parent, node)) {
          return;
        }

        const start = node.range[0];
        const end = node.range[1] + 1;
        const startLine = node.loc.start.line;
        const endLine = node.loc.end.line;
        const original = source.slice(start, end);
        const functionName = contextChecker.getFunctionName(visit, startLine, endLine);

        // Replace the type token at its exact AST location
        const typeStart = typeNode.range[0] - start;
        const typeEnd = typeNode.range[1] + 1 - start;
        const replacement = original.slice(0, typeStart) + smallerType + original.slice(typeEnd);

        pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, this.ID));
      }
    });

    /**
     * Returns the next smaller conventional integer or fixed-byte type.
     * @param {String} input the original type name
     * @returns {String|null} the reduced type, or null if unsupported
     */
    function reduceType(input) {
      const integerWidths = [8, 16, 32, 64, 128, 256];
      const byteWidths = [1, 2, 4, 8, 16, 32];
      const integerMatch = /^(uint|int)([0-9]*)$/.exec(input);

      if (integerMatch) {
        const size = Number(integerMatch[2] || "256");

        if (size < 8 || size > 256 || size % 8 !== 0) {
          return null;
        }

        for (let index = integerWidths.length - 1; index >= 0; index--) {
          if (integerWidths[index] < size) {
            return `${integerMatch[1]}${integerWidths[index]}`;
          }
        }

        return null;
      }

      const bytesMatch = /^bytes([0-9]+)$/.exec(input);

      if (bytesMatch) {
        const size = Number(bytesMatch[1]);

        if (size < 1 || size > 32) {
          return null;
        }

        for (let index = byteWidths.length - 1; index >= 0; index--) {
          if (byteWidths[index] < size) {
            return `bytes${byteWidths[index]}`;
          }
        }
      }

      return null;
    }

    /**
     * Returns the explicit elementary type used in a nested cast.
     * @param {Object} expression an AST expression
     * @returns {String|null} the type name, or null
     */
    function getCastType(expression) {
      if (!expression || expression.type !== "FunctionCall") {
        return null;
      }

      if (!expression.expression || expression.expression.type !== "ElementaryTypeName") {
        return null;
      }

      return expression.expression.name;
    }

    /**
     * Returns the bit width and family of a supported elementary type.
     * @param {String} type the elementary type name
     * @returns {Object|null} width information or null
     */
    function getTypeInfo(type) {
      const integerMatch = /^(uint|int)([0-9]*)$/.exec(type || "");

      if (integerMatch) {
        const size = Number(integerMatch[2] || "256");

        if (size >= 8 && size <= 256 && size % 8 === 0) {
          return { family: integerMatch[1], size: size };
        }
      }

      const bytesMatch = /^bytes([0-9]+)$/.exec(type || "");

      if (bytesMatch) {
        const size = Number(bytesMatch[1]);

        if (size >= 1 && size <= 32) {
          return { family: "bytes", size: size };
        }
      }

      return null;
    }

    /**
     * Detects literal operands that are likely equivalent or invalid after narrowing.
     * @param {Object} argument the conversion operand
     * @returns {Boolean} whether to skip the operand
     */
    function isLiteral(argument) {
      if (!argument) {
        return false;
      }

      const literalTypes = ["NumberLiteral", "DecimalNumber", "HexNumber", "HexLiteral", "StringLiteral"];

      if (literalTypes.includes(argument.type)) {
        return true;
      }

      if (argument.type === "UnaryOperation") {
        if (argument.operator === "-" || argument.operator === "+") {
          return isLiteral(argument.subExpression);
        }
      }

      return false;
    }

    /**
     * Discards nested casts whose values already fit in the reduced type.
     * @param {Object} argument the conversion operand
     * @param {String} smallerType the candidate type
     * @returns {Boolean} whether the mutation is obviously equivalent
     */
    function isObviouslyEquivalent(argument, smallerType) {
      const sourceInfo = getTypeInfo(getCastType(argument));
      const targetInfo = getTypeInfo(smallerType);

      if (!sourceInfo || !targetInfo) {
        return false;
      }

      if (sourceInfo.family !== targetInfo.family) {
        return false;
      }

      return sourceInfo.size <= targetInfo.size;
    }

    /**
     * Rejects known invalid combinations that can be identified without type inference.
     * Compilation validation is still necessary for remaining candidates.
     * @param {Object} argument the conversion operand
     * @param {String} originalType the original conversion target
     * @param {String} smallerType the reduced conversion target
     * @param {Object} parent the parent AST node
     * @param {Object} node the current conversion call
     * @returns {Boolean} whether a known incompatibility exists
     */
    function hasKnownInvalidConversion(argument, originalType, smallerType, parent, node) {
      const sourceType = getCastType(argument);
      const sourceInfo = getTypeInfo(sourceType);
      const originalInfo = getTypeInfo(originalType);
      const targetInfo = getTypeInfo(smallerType);

      // Solidity 0.8+ forbids explicit conversions that change both
      // numeric/bytes category and width in the same step.
      if (sourceInfo && originalInfo && targetInfo) {
        if (sourceInfo.family !== targetInfo.family) {
          const sourceBits = sourceInfo.family === "bytes" ? sourceInfo.size * 8 : sourceInfo.size;
          const targetBits = targetInfo.family === "bytes" ? targetInfo.size * 8 : targetInfo.size;

          if (sourceBits !== targetBits) {
            return true;
          }
        }
      }

      if (sourceType === "address" || sourceType === "address payable") {
        return true;
      }

      // An outer address(...) conversion requires uint160 or bytes20.
      if (parent && parent.type === "FunctionCall" && parent.arguments) {
        if (parent.arguments.length === 1 && parent.arguments[0] === node) {
          const outerType = parent.expression;

          if (outerType && outerType.type === "ElementaryTypeName") {
            if (outerType.name === "address" || outerType.name === "address payable") {
              return true;
            }
          }
        }
      }

      return false;
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
