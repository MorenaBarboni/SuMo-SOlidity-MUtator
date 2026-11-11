const contextChecker = require("../contextChecker");
const Mutation = require("../../mutation");

class RSDoperator {
  constructor() {
    this.ID = "RSD";
    this.name = "return-statement-deletion";
  }

  /**
  * Generates RSD mutations for deleting the payable keyword from function definitions
  * 
  * @param {string} file - The path of the Solidity source file
  * @param {string} source - The Solidity source code
  * @param {Function} visit - The solidity-parser-ast visitor function
  * 
  * @returns {Mutation[]} The generated mutations
  */
  getMutations(file, source, visit) {
    const mutations = [];
    const enumDefinitions = [];

    // Collect all enum definitions in the source code to check for default values later
    visit({
      EnumDefinition: (node) => {
        enumDefinitions.push(node);
      }
    });

    // Mutate return statements in function definitions
    visit({
      ReturnStatement: (returnNode) => {
        const functionNode = contextChecker.getEnclosingNode(visit, returnNode.loc.start.line, returnNode.loc.end.line);

        if (!functionNode) {
          return;
        }

        const functionName = functionNode.name;
        const functionReturnParameters = functionNode.returnParameters || [];
        const explicitReturnNode = returnNode.expression;

        const start = returnNode.range[0];
        const end = returnNode.range[1] + 1;
        const startLine = returnNode.loc.start.line;
        const endLine = returnNode.loc.end.line;
        const original = source.slice(start, end);
        let replacement;

        // Mutate a bare return because removing it allows execution to continue,
        // potentially executing statements that were originally skipped.
        if (!explicitReturnNode) {
          replacement = `/* ${original.replace(/\*\//g, "* /")} */`;
          pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, this.ID));
          return;
        }

        // Remove the return behavior but keep the FunctionCall, ensuring that side effects are preserved.
        // Avoid mutating FunctionCall nodes that represent type conversions as they already produce the default return value.
        if (explicitReturnNode.type === "FunctionCall") {
          if (isDefaultValue(explicitReturnNode, functionReturnParameters[0])) {
            return;
          }
          replacement = original.replace(/^return\s*/, "").trim();
          pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, this.ID));
          return;
        }

        // Avoid equivalent mutants: removing a return statement that already returns
        // the default value would not change the function's observable return value.
        const canMutate = canMutateReturnStatement(explicitReturnNode, functionReturnParameters);

        if (canMutate) {
          const functionReturnParametersNames = functionReturnParameters.filter(parameter => parameter.name).map(parameter => parameter.name);

          // If 
          if (functionReturnParametersNames.length === 0 || (explicitReturnNode.components && functionReturnParametersNames.length !== explicitReturnNode.components.length)) {
            replacement = `/* ${original.replace(/\*\//g, "* /")} */`;
            pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, this.ID));
          }
          else if (!isEquivalentReturn(functionReturnParametersNames, explicitReturnNode)) {
            replacement = `/* ${original.replace(/\*\//g, "* /")} */`;
            pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, this.ID));
          }
        }
      }
    });

    return mutations;

    /**
     * Checks whether a return statement can be mutated without producing an equivalent default-value mutant.
     *
     * @param {Object} returnValueNode the returned expression
     * @param {Array} functionReturnParameters the function's declared return parameters
     * @returns {boolean} true when the returned value is not already the default value
     */
    function canMutateReturnStatement(returnValueNode, functionReturnParameters) {
      if (returnValueNode.components && returnValueNode.type === "TupleExpression") {
        return !returnValueNode.components.every((component, index) => {
          return isDefaultValue(component, functionReturnParameters[index]);
        });
      }

      return !isDefaultValue(returnValueNode, functionReturnParameters[0]);
    }

    /**
     * Checks whether an expression matches the default value of its declared return type.
     *
     * @param {Object} returnValueNode the returned expression
     * @param {Object} returnTypeNode the corresponding return parameter
     * @returns {boolean} true when the expression is the default value
     */
    function isDefaultValue(returnValueNode, returnTypeNode) {
      if (!returnValueNode || !returnTypeNode || !returnTypeNode.typeName) {
        return false;
      }

      const typeNameNode = returnTypeNode.typeName;
      const typeName = typeNameNode.name || "";
      let valueNode = returnValueNode;

      // Unwrap simple casts such as uint256(0), address(0), and bytes32(0).
      if (valueNode.type === "FunctionCall" &&
        valueNode.expression.type === "ElementaryTypeNameExpression" &&
        valueNode.arguments.length === 1) {
        valueNode = valueNode.arguments[0];
      }

      if (typeName === "bool" && valueNode.type === "BooleanLiteral" && valueNode.value === false) {
        return true;
      }

      if ((typeName.startsWith("uint") || typeName.startsWith("int")) &&
        contextChecker.isZeroLiteral(valueNode)) {
        return true;
      }

      if (typeName === "address" && valueNode.type === "NumberLiteral" &&
        (valueNode.number === "0" ||
          valueNode.number === "0x0000000000000000000000000000000000000000")) {
        return true;
      }

      if (typeName === "string" && valueNode.type === "StringLiteral" && valueNode.value === "") {
        return true;
      }

      if (typeName === "bytes" &&
        ((valueNode.type === "StringLiteral" && valueNode.value === "") ||
          (valueNode.type === "HexLiteral" && getHexValue(valueNode) === ""))) {
        return true;
      }

      if (/^bytes([1-9]|[12][0-9]|3[0-2])$/.test(typeName) &&
        (
          (valueNode.type === "NumberLiteral" &&
            (valueNode.number === "0" || /^0x0+$/i.test(valueNode.number))) ||
          (valueNode.type === "HexLiteral" && /^0+$/.test(getHexValue(valueNode)))
        )) {
        return true;
      }

      // An enum's first member is its default value.
      if (typeNameNode.type === "UserDefinedTypeName" &&
        valueNode.type === "MemberAccess" &&
        typeNameNode.namePath) {
        const enumName = typeNameNode.namePath.split(".").pop();
        const matchingEnums = enumDefinitions.filter(enumNode => enumNode.name === enumName);

        if (matchingEnums.length === 1 &&
          matchingEnums[0].members.length > 0 &&
          valueNode.memberName === matchingEnums[0].members[0].name &&
          valueNode.expression.type === "Identifier" &&
          valueNode.expression.name === enumName) {
          return true;
        }
      }

      return false;
    }

    /**
     * Gets the hexadecimal content stored by a HexLiteral AST node.
     *
     * @param {Object} valueNode the hexadecimal literal node
     * @returns {string} the hexadecimal content without a prefix
     */
    function getHexValue(valueNode) {
      const value = Array.isArray(valueNode.value)
        ? valueNode.value.join("")
        : String(valueNode.value || "");

      return value.replace(/^0x/i, "");
    }

    /**
     * Checks whether an explicit return is equivalent to an implicit return through named return parameters.
     *
     * @param {Array<string>} implicitReturnNames the declared return variable names
     * @param {Object} explicitReturnNode the explicit return expression
     * @returns {boolean} true when both return forms are equivalent
     */
    function isEquivalentReturn(implicitReturnNames, explicitReturnNode) {
      if (!explicitReturnNode.components) {
        return implicitReturnNames.length === 1 &&
          explicitReturnNode.type === "Identifier" &&
          implicitReturnNames[0] === explicitReturnNode.name;
      }

      return explicitReturnNode.components.every((component, index) => {
        return component.type === "Identifier" &&
          implicitReturnNames[index] === component.name;
      });
    }

    /**
     * Adds a mutation to the list unless an equivalent mutation is already present.
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

module.exports = RSDoperator;