const contextChecker = require("../contextChecker");
const Mutation = require("../../mutation");

class MOIOperator {
  constructor() {
    this.ID = "MOI";
    this.name = "modifier-insertion";
  }

  /**
  * Generates MOI mutations for inserting function modifiers
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
    const modifierCandidates = [];

    visitModifiers(visitFunctions);

    /**
     * Collects access-control modifier invocations and the function parameters
     * that are in scope where each invocation was originally used.
     * @param {Function} callback the function-collection pass
     */
    function visitModifiers(callback) {
      visit({
        FunctionDefinition: (node) => {
          if (node.isConstructor || node.isReceiveEther || node.isFallback) {
            return;
          }

          // Collect candidate modifiers whose names start with "only" and are used in this function.
          (node.modifiers || []).forEach((modifierNode) => {
            if (typeof modifierNode.name === "string" && modifierNode.name.startsWith("only")) {
              modifierCandidates.push({ modifierNode, sourceFunctionNode: node });
            }
          });
        }
      });

      if (modifierCandidates.length > 0) {
        callback();
      }
    }

    /**
     * Visits eligible functions and tries each collected modifier invocation
     * whose arguments remain valid in the target function's parameter scope.
     */
    function visitFunctions() {
      visit({
        FunctionDefinition: (functionNode) => {
          const isSpecialFunction = functionNode.isConstructor || functionNode.isReceiveEther || functionNode.isFallback;
          const isReadOnly = functionNode.stateMutability === "pure" || functionNode.stateMutability === "view";

          //Do not mutate special functions or read-only functions.
          if (!functionNode.body || isSpecialFunction || isReadOnly) {
            return;
          }

          // Collect the names of modifiers already attached to the function
          const existingModifierNames = (functionNode.modifiers || []).map(
            (modifierNode) => modifierNode.name
          );

          // Try to apply each candidate modifier invocation
          for (let i = 0; i < modifierCandidates.length; i++) {

            const candidate = modifierCandidates[i];
            const modifierName = candidate.modifierNode.name;

            // Skip if the function already has this modifier
            if (existingModifierNames.includes(modifierName)) {
              continue;
            }
            // Skip if modifier arguments are not compatible with the target function's parameters
            if (!areModifierArgumentsCompatible(candidate.sourceFunctionNode, functionNode, candidate.modifierNode)) {
              continue;
            }

            const mutation = mutate(visit, functionNode, candidate);
            if (mutation) {
              pushMutation(mutation);
              break; // Only one modifier insertion per function.
            }
          }
        }
      });
    }

    /**
     * Checks whether identifiers used by a modifier invocation are available
     * with the same meaning in the target function.
     * 
     * @param {Object} sourceFunctionNode the function containing the original invocation
     * @param {Object} targetFunctionNode the function receiving the invocation
     * @param {Object} modifierNode the modifier invocation to insert
     * 
     * @returns {boolean} whether the invocation can be reused safely
     */
    function areModifierArgumentsCompatible(sourceFunctionNode, targetFunctionNode, modifierNode) {
      const modifierArguments = modifierNode.arguments || [];

      // Modifiers without arguments do not depend on the source function's scope.
      if (modifierArguments.length === 0) {
        return true;
      }

      const referencedIdentifiers = contextChecker.getIdentifierNames(modifierArguments);

      const sourceParameters = getFunctionParametersByName(sourceFunctionNode);
      const targetParameters = getFunctionParametersByName(targetFunctionNode);

      for (const identifierName of referencedIdentifiers) {
        const sourceParameter = sourceParameters.get(identifierName);
        const targetParameter = targetParameters.get(identifierName);

        if (sourceParameter) {
          // A referenced function parameter must exist with the same type in the target.
          if (!targetParameter || !haveCompatibleParameterTypes(sourceParameter, targetParameter)) {
            return false;
          }
        } else if (targetParameter) {
          // A target parameter must not shadow a contract-level or global identifier.
          return false;
        }
      }

      return true;
    }

    /**
     * Creates a lookup of the named parameters declared by a function.
     * @param {Object} functionNode the function whose parameters are inspected
     * @returns {Map} parameter names mapped to their declaration nodes
     */
    function getFunctionParametersByName(functionNode) {
      const parametersByName = new Map();

      (functionNode.parameters || []).forEach((parameterNode) => {
        if (parameterNode.name) {
          parametersByName.set(parameterNode.name, parameterNode);
        }
      });

      return parametersByName;
    }

    /**
     * Checks that two parameters have equivalent types and data locations.
     * @param {Object} firstParameter the parameter from the original function
     * @param {Object} secondParameter the parameter from the target function
     * @returns {boolean} whether the parameter declarations are compatible
     */
    function haveCompatibleParameterTypes(firstParameter, secondParameter) {
      const firstSignature = contextChecker.getParameterTypeSignature(firstParameter);
      const secondSignature = contextChecker.getParameterTypeSignature(secondParameter);

      return firstSignature !== null && firstSignature === secondSignature;
    }

    /**
     * Creates a mutation by inserting the modifier invocation into the target
     * function signature, provided both functions belong to the same contract.
     * @param {Function} visit the AST visitor
     * @param {Object} functionNode the function to be mutated
     * @param {Object} candidate the modifier invocation and its source function
     * @returns {Object|boolean} the mutation, or false when the contracts differ
     */
    function mutate(visit, functionNode, candidate) {
      const targetContract = contextChecker.contractContaining(visit, functionNode);
      const sourceContract = contextChecker.contractContaining(visit, candidate.modifierNode);

      if (targetContract && targetContract === sourceContract) {
        const startF = functionNode.range[0];
        const endF = functionNode.body.range[0];
        const original = source.substring(startF, endF);
        const startLine = functionNode.loc.start.line;
        const endLine = functionNode.body.loc.start.line;
        const functionName = functionNode.name;
        const startM = candidate.modifierNode.range[0];
        const endM = candidate.modifierNode.range[1] + 1;
        const modifier = source.substring(startM, endM);
        let replacement;

        // Keep the modifier before the returns clause, as required by Solidity syntax.
        const returnsIndex = original.indexOf("returns");
        if (returnsIndex !== -1) {
          replacement = original.slice(0, returnsIndex) + modifier + " " + original.slice(returnsIndex);
        } else {
          replacement = original + modifier + " ";
        }

        return new Mutation(file, functionName, startF, endF, startLine, endLine, original, replacement, ID);
      }

      return false;
    }

    /**
     * Adds a mutation unless an equivalent mutation is already present.
     * @param {Object} mutation the mutation to add
     */
    function pushMutation(mutation) {
      if (!mutations.some((existingMutation) => existingMutation.id === mutation.id)) {
        mutations.push(mutation);
      }
    }

    return mutations;
  }
}

module.exports = MOIOperator;