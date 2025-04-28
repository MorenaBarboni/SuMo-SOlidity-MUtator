const contextChecker = require("../contextChecker");
const Mutation = require("../../mutation");


/**
 * Return Statement Deletion (RSD) Operator.
 * This mutation operator targets return statements inside functions,
 * commenting them out if safe.
 */
class RSDoperator {
  constructor() {
    this.ID = "RSD";
    this.name = "return-statement-deletion";
  }

  /**
   * Generate mutations by visiting ReturnStatements in the AST.
   * 
   * @param {string} file - Path or name of the file being mutated
   * @param {string} source - Full source code of the file
   * @param {function} visit - Function to traverse the AST nodes
   * @returns {Mutation[]} - Array of generated Mutation objects
   */
  getMutations(file, source, visit) {
    const mutations = [];

    /**
      * Handler for ReturnStatement nodes.
      * Attempts to mutate return statements if conditions are met.
    */
    visit({
      ReturnStatement: (returnNode) => {
        const functionNode = contextChecker.getEnclosingNode(visit, returnNode.loc.start.line, returnNode.loc.end.line);
        if (!functionNode || !functionNode.returnParameters) return;

        const functionName = functionNode.name;
        const functionReturnParameters = functionNode.returnParameters;
        const functionReturnParametersNames = functionReturnParameters
          .filter(e => e.name)
          .map(e => e.name);

        const explicitReturnNode = returnNode.expression;

        const start = returnNode.range[0];
        const end = returnNode.range[1] + 1;
        const startLine = returnNode.loc.start.line;
        const endLine = returnNode.loc.end.line;
        const original = source.slice(start, end);
        let replacement = "/* " + original + " */";

        // If the return value is a direct function call, remove 'return' but keep the call
        if (explicitReturnNode?.type === "FunctionCall") {
          const functionCallString = original.replace(/^return\s*/, '');
          replacement = functionCallString.trim();
          pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, this.ID));
        }
        // Check if it's safe to mutate the return without generating equivalent mutants
        else {
          const canMutate = canMutateReturnStatement(explicitReturnNode, functionReturnParameters);
          if (canMutate) {
            if (functionReturnParametersNames.length === 0 || (explicitReturnNode?.components && functionReturnParametersNames.length !== explicitReturnNode.components.length)) {
              pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, this.ID));
            } else if (!isEquivalentReturn(functionReturnParametersNames, explicitReturnNode)) {
              pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, this.ID));
            }
          }
        }
      }
    });
    /**
     * Check if a return statement can be mutated.
     * A return should not be mutated if it already returns the default value for its type.
     * 
     * @param {Object} returnValueNode - The node representing the returned value
     * @param {Array} functionReturnParameters - Array of return parameter nodes
     * @returns {boolean} - True if it can be mutated, false otherwise
     */
    function canMutateReturnStatement(returnValueNode, functionReturnParameters) {
      if (returnValueNode.components && returnValueNode.type === "TupleExpression") {
        return !returnValueNode.components.every((component, index) => isDefaultValue(component, functionReturnParameters[index])
        );
      } else {
        return !isDefaultValue(returnValueNode, functionReturnParameters[0]);
      }
    }

    /**
     * Check if a given value matches the default value for its type.
     * 
     * @param {Object} returnValueNode - The node representing the returned value
     * @param {Object} returnTypeNode - The node representing the expected return type
     * @returns {boolean} - True if value is the default, false otherwise
     */
    function isDefaultValue(returnValueNode, returnTypeNode) {
      const typeName = returnTypeNode.typeName?.name;
      if (typeName) {
        if ((typeName === "bool" && returnValueNode.value === false) ||
          (typeName.startsWith("uint") && returnValueNode.number === "0") ||
          typeName === "address" && (returnValueNode.number === "0" || returnValueNode.number === "0x0000000000000000000000000000000000000000") ||
          (returnValueNode.type === "StringLiteral" && returnValueNode.value === "")) {
          return true;
        }
      }
      return false;
    }


    /**
     * Check if an explicit return is equivalent to an implicit return (by variable name).
     * Avoids generating mutants that behave identically to the original.
     * 
     * @param {Array<string>} implicitReturnNames - Expected return variable names
     * @param {Object} explicitReturnNode - Node representing the explicit return expression
     * @returns {boolean} - True if returns are equivalent, false otherwise
     */
    function isEquivalentReturn(implicitReturnNames, explicitReturnNode) {
      if (!explicitReturnNode.components) {
        return implicitReturnNames.length === 1 && explicitReturnNode.type === "Identifier" && implicitReturnNames[0] === explicitReturnNode.name;
      }
      return explicitReturnNode.components.every((component, index) => component.type === "Identifier" && implicitReturnNames[index] === component.name
      );
    }

    /**
    * Push a mutation into the mutations array if not already added.
    * 
    * @param {Mutation} mutation - Mutation instance to add
    */
    function pushMutation(mutation) {
      if (!mutations.some(m => m.id === mutation.id)) {
        mutations.push(mutation);
      }
    }

    return mutations;
  }
}


module.exports = RSDoperator;