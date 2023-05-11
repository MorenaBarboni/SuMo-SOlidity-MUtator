const Mutation = require("../../mutation");

function MOIOperator() {
  this.ID = "MOI";
  this.name = "modifier-insertion";
}

MOIOperator.prototype.getMutations = function (file, source, visit) {
  const ID = this.ID;
  const mutations = [];
  var modifiers = []; //Modifiers attached to functions
  var modifiersNodes = []; //Modifiers nodes attached to functions

  visitModifiers(visitFunctions);

  /*Save attached modifiers */
  function visitModifiers(callback) {
    visit({
      ModifierInvocation: (node) => {
        var m = source.slice(node.range[0], node.range[1] + 1);
        if (!modifiers.includes(m)) {
          modifiers.push(m);
          if (!modifiersNodes.includes(node)) {
            modifiersNodes.push(node);
          }
        }
      }
    });
    if (modifiers.length > 0) {
      //Reverese modifiers to minimize chance of picking an invalid one
      modifiers = modifiers.reverse()
      modifiersNodes = modifiersNodes.reverse()
      callback();
    }
  }

  /*Visit not decorated functions */
  function visitFunctions() {
    visit({
      FunctionDefinition: (fNode) => {
        /*If the function is not decorated */
        if (fNode.modifiers.length === 0 && fNode.body) {
          /*If the function is not special */
          if (fNode.body && !fNode.isConstructor && !fNode.isReceiveEther && !fNode.isFallback
            && (!fNode.stateMutability || (fNode.stateMutability !== "pure" && fNode.stateMutability !== "view"))) {

            //Cycle the available modifiers nodes
            for (let i = 0; i < modifiersNodes.length; i++) {
              const mNode = modifiersNodes[i];

              //If the modifier has parameters, they must be compatible with the function parameters
              if (mNode.arguments) {

                //If the function has parameters
                if (fNode && fNode.parameters) {

                  var modArguments = [];
                  var funcArguments = [];

                  //Save modifier parameters
                  mNode.arguments.forEach(e => {
                    if (e.name)
                      modArguments.push(e.name);
                  });

                  //Save function parameters
                  fNode.parameters.forEach(e => {
                    funcArguments.push(e.name);
                  });

                  //If the parameters of the modifier are included in the parameters of the function
                  if (modArguments.length > 0) {
                    var params_included = modArguments.every(function (element, index) {
                      return element === funcArguments[index];
                    });
                    if (params_included) {
                      const result = mutate(fNode, mNode);
                      if (result) {
                        mutations.push(result);
                        break;
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
                const result = mutate(fNode, mNode);
                if (result) {
                  mutations.push(result);
                  break;
                }
              }
            }
          }
        }
      }
    });
  }


  /**
   * Applies a mutation to the function
   * @param functionNode the function node to be mutated
   * @param modifierNode the replacement node
   *
   */
  function mutate(functionNode, modifierNode) {
    if (contractContaining(functionNode) === contractContaining(modifierNode) && contractContaining(functionNode)) {

      var startF = functionNode.range[0];
      var endF = functionNode.body.range[0];
      var original = source.substring(startF, endF);  //function signature
      const startLine = functionNode.loc.start.line;
      const endLine = functionNode.body.loc.start.line;

      var startM = modifierNode.range[0];
      var endM = modifierNode.range[1] + 1;
      var modifier = source.substring(startM, endM);

      //If the function has return parameters
      if (functionNode.returnParameters && functionNode.returnParameters.length > 0) {
        var slice1 = original.split("returns")[0];
        var slice2 = " returns" + original.split("returns")[1];
        var replacement = slice1 + modifier + slice2;
        return new Mutation(file, startF, endF, startLine, endLine, original, replacement, ID);
      }
      //If the function has no return parameters
      else {
        var replacement = original + modifier + " ";
        return new Mutation(file, startF, endF, startLine, endLine, original, replacement, ID);
      }
    } else {
      return false;
    }
  }

  /**
 * Checks to which contract a node belongs to
 * @param node the input node
 * @returns the contract name (or false if no contract is found)
 */
  function contractContaining(node) {
    const nodeStart = node.range[0];
    const nodeEnd = node.range[1];
    let cName = false;
    visit({
      ContractDefinition: (cNode) => {
        if (nodeStart >= cNode.range[0] && nodeEnd <= cNode.range[1]) {
          cName = cNode.name;
        }
      }
    });
    return cName;
  }


  return mutations;
};

module.exports = MOIOperator;
