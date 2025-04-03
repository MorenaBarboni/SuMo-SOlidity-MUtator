/** DISABLED */
const contextChecker = require("../contextChecker");
const Mutation = require("../../mutation");

class MOIOperator {
  constructor() {
    this.ID = "MOI";
    this.name = "modifier-insertion";
  }
  getMutations(file, source, visit) {
    const ID = this.ID;
    const mutations = [];
    const modifiersNodes = []; //Modifiers nodes attached to functions

    visitModifiers(visitFunctions);

    /*Save attached modifiers - only those starting with "only" */
    function visitModifiers(callback) {
      visit({
        FunctionDefinition: (node) => {
          if (!node.isConstructor && !node.isReceiveEther && !node.isFallback) {
            node.modifiers.forEach(mNode => {
              if (!modifiersNodes.includes(mNode) && mNode.name.startsWith("only")) {
                modifiersNodes.push(mNode);
              }
            });
          }
        }
      });
      if (modifiersNodes.length > 0) {
        callback();
      }
    }

    /*Visit functions to be mutated */
    function visitFunctions() {
      visit({
        FunctionDefinition: (fNode) => {

          /*If the function is not special */
          if (fNode.body &&
            !fNode.isConstructor && !fNode.isReceiveEther && !fNode.isFallback &&
            (!fNode.stateMutability || (fNode.stateMutability !== "pure" && fNode.stateMutability !== "view"))) {

            const functionModifierNames = fNode.modifiers.map((mNode) => mNode.name);

            //Cycle the available modifiers nodes
            for (let i = 0; i < modifiersNodes.length; i++) {
              const mNode = modifiersNodes[i];

              //If the function does not already include the modifier
              if (functionModifierNames.length === 0 ||
                (functionModifierNames.length > 0 && !functionModifierNames.includes(mNode.name))) {

                //If the modifier has parameters, they must be compatible with the function parameters
                if (mNode.arguments) {

                  //If the function has parameters
                  if (fNode && fNode.parameters) {

                    //Save modifier parameters
                    const modArguments = mNode.arguments.map((e) => e.name);
                    //Save function parameters
                    const funcArguments = fNode.parameters.map((e) => e.name);

                    //If the parameters of the modifier are included in the parameters of the function
                    if (modArguments.length > 0) {
                      var params_included = modArguments.every(function (element, index) {
                        return element === funcArguments[index];
                      });
                      if (params_included) {
                        const result = mutate(visit, fNode, mNode);
                        if (result) {
                          pushMutation(result);
                          break; //push one modifier max
                        }
                      }
                    }
                  }

                  //If the function does not have arguments, skip the mutation
                  else {
                    break;
                  }
                }

                //If the modifier does not have arguments
                else {
                  const result = mutate(visit, fNode, mNode);
                  if (result) {
                    pushMutation(result);
                    break; //push one modifier max
                  }
                }
              }
            }
          }
        }
      });
    }

    /**
      * Checks if the modifier is a valid mutation candidate for the function.
      * The modifier must be used in the same contract in which the function is defined.
      * @param {Function} visit the visitor
      * @param functionNode the function node to be mutated
      * @param modifierNode the potential modifier replacement node
      * @returns a mutation if the modifier can be used, false otherwise
   */
    function mutate(visit, functionNode, modifierNode) {
      const containingContract = contextChecker.contractContaining(visit, functionNode);
      if (containingContract === contextChecker.contractContaining(visit, modifierNode) && containingContract) {
        const startF = functionNode.range[0];
        const endF = functionNode.body.range[0];
        const original = source.substring(startF, endF); //function signature
        const startLine = functionNode.loc.start.line;
        const endLine = functionNode.body.loc.start.line;
        const functionName = functionNode.name;
        const startM = modifierNode.range[0];
        const endM = modifierNode.range[1] + 1;
        const modifier = source.substring(startM, endM);
        let replacement;

        //If the function has return parameters
        if (functionNode.returnParameters && functionNode.returnParameters.length > 0) {
          const slice1 = original.split("returns")[0];
          const slice2 = " returns" + original.split("returns")[1];
          replacement = slice1 + modifier + slice2;
        } else {
          replacement = original + modifier + " ";
        }
        return new Mutation(file, functionName, startF, endF, startLine, endLine, original, replacement, ID);
      } else {
        return false;
      }
    }

    /**
     * Add a mutation to the mutations list
     * @param {Object} mutation the mutation object
     */
    function pushMutation(mutation) {
      if (!mutations.some(m => m.id === mutation.id)) {
        mutations.push(mutation);
      }
    }

    return mutations;
  }
}

module.exports = MOIOperator;
