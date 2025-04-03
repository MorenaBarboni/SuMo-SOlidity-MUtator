const Mutation = require("../../mutation");

class RSDoperator {
  constructor() {
    this.ID = "RSD";
    this.name = "return-statement-deletion";
  }
  getMutations(file, source, visit) {
    const mutations = [];

    visit({
      FunctionDefinition: (node) => {

        //If the function has return parameters and is not empty
        if (node.returnParameters && node.body?.statements) {
          const functionName = node.name;
          // Extract function return parameters (if any)
          const functionReturnParameters = node.returnParameters;
          // Extract function return parameter variable names (if any)
          const functionReturnParametersNames = functionReturnParameters
            .filter(e => e.name)
            .map(e => e.name);

          // Find explicit return statement within the function body
          const returnStatement = node.body.statements.find(statement => statement.type === "ReturnStatement");

          // If the function has an explicit return statement
          if (returnStatement) {
            const explicitReturnNode = returnStatement.expression;
            const returnNodePosition = node.body.statements.indexOf(returnStatement);
            const start = returnStatement.range[0];
            const end = returnStatement.range[1] + 1;
            const startLine = returnStatement.loc.start.line;
            const endLine = returnStatement.loc.end.line;
            const original = source.slice(start, end);
            let replacement = "/* " + original + " */";

            //If the return statement is a standard function call remove the return but keep the call
            if (explicitReturnNode.type === "FunctionCall") {
              const functionCallString = original.replace(/^return\s*/, '');
              replacement = functionCallString.trim();
              pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, this.ID));

            }
            else {
              // If the return statement is not the last statement in the function
              if (node.body.statements.length - 1 !== returnNodePosition) {
                pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, this.ID));
              } else {
                // Check if the return statement can be mutated
                const canMutate = checkReturnStatement(explicitReturnNode, functionReturnParameters);
                //If the return parameter(s) is not equal to the default value for its type
                if (canMutate) {
                  // If the function does not specify the return variable names / the lenghts don't match
                  if (functionReturnParametersNames.length === 0 || (explicitReturnNode.components && functionReturnParametersNames.length !== explicitReturnNode.components.length) || node.body.statements.length - 1 !== returnNodePosition) {
                    pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, this.ID));
                  }

                  // If the function specifies the return variable names AND the return statement is the last statement,
                  // Ensure that removing the return value would not generate an equivalent mutant
                  else if (!isEquivalentReturn(functionReturnParametersNames, explicitReturnNode)) {
                    pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, this.ID));
                  }
                }
              }
            }
          }
        }
      }
    });

    /**
     * Check if the return statement of a function can be mutated based on the returned value and type.
     * If the statement already returns the default value for the return type(s), it must not be mutated.
     * @param {Object} returnValueNode the return value node to be checked
     * @param {Array} functionReturnParameters the return parameters of the function enclosing the return
     * @returns true if the node can be mutated, false otherwise
     */
    function checkReturnStatement(returnValueNode, functionReturnParameters) {
      if (returnValueNode.components && returnValueNode.type === "TupleExpression") {
        return !returnValueNode.components.every((component, index) => isDefaultValue(component, functionReturnParameters[index])
        );
      } else {
        return !isDefaultValue(returnValueNode, functionReturnParameters[0]);
      }
    }

    /**
     * Check if a return parameter is equal to the default value for its type.
     * @param {Object} returnValueNode The return parameter value node
     * @param {String} returnTypeNode The return parameter type node
     * @returns true if the node corresponds to the default value for its type, false otherwise
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
     * Check if implicit and explicit return statements are equivalent
     * @param {Array} implicitReturnNames  variable names of the function return parameters
     * @param {Object} explicitReturnNode variable names of the explicit return statement
     * @returns true if removing the return statement would generate and equivalent mutant, false otherwise.
     */
    function isEquivalentReturn(implicitReturnNames, explicitReturnNode) {
      if (!explicitReturnNode.components) {
        return implicitReturnNames.length === 1 && explicitReturnNode.type === "Identifier" && implicitReturnNames[0] === explicitReturnNode.name;
      }
      return explicitReturnNode.components.every((component, index) => component.type === "Identifier" && implicitReturnNames[index] === component.name
      );
    }

    //Push mutations
    function pushMutation(mutation) {
      if (!mutations.some(m => m.id === mutation.id)) {
        mutations.push(mutation);
      }
    }

    return mutations;
  }
}


module.exports = RSDoperator;